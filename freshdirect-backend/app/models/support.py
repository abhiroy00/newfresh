import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class TicketStatus(str, PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class SenderType(str, PyEnum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", foreign_keys="[SupportTicket.user_id]")
    messages: Mapped[list["SupportMessage"]] = relationship(
        "SupportMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="SupportMessage.created_at"
    )

    def __repr__(self) -> str:
        return f"<SupportTicket {self.id} status={self.status}>"


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type: Mapped[SenderType] = mapped_column(Enum(SenderType), nullable=False)
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket: Mapped["SupportTicket"] = relationship("SupportTicket", back_populates="messages")

    def __repr__(self) -> str:
        return f"<SupportMessage {self.id} ticket={self.ticket_id}>"
