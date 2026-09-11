from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.support import SupportTicket, SupportMessage, TicketStatus, SenderType

router = APIRouter(prefix="/support", tags=["Support"])


class CreateTicketRequest(BaseModel):
    subject: str
    message: str


class AddMessageRequest(BaseModel):
    message: str


def _serialize_ticket(t: SupportTicket, include_messages: bool = False):
    data = {
        "id": t.id,
        "subject": t.subject,
        "status": t.status.value if hasattr(t.status, "value") else t.status,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }
    if include_messages:
        data["messages"] = [
            {
                "id": m.id,
                "sender_type": m.sender_type.value if hasattr(m.sender_type, "value") else m.sender_type,
                "message": m.message,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in t.messages
        ]
    return data


@router.get("/tickets")
async def list_my_tickets(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List the current user's support tickets, most recent first."""
    result = await db.execute(
        select(SupportTicket)
        .where(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.updated_at.desc())
    )
    tickets = result.scalars().all()
    return {"success": True, "data": [_serialize_ticket(t) for t in tickets]}


@router.get("/tickets/{ticket_id}")
async def get_my_ticket(ticket_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .where(SupportTicket.id == ticket_id, SupportTicket.user_id == current_user.id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    return {"success": True, "data": _serialize_ticket(ticket, include_messages=True)}


@router.post("/tickets", status_code=201)
async def create_or_continue_ticket(
    payload: CreateTicketRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new conversation, or continue the most recent still-open one."""
    result = await db.execute(
        select(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .where(
            SupportTicket.user_id == current_user.id,
            SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
        )
        .order_by(SupportTicket.updated_at.desc())
    )
    ticket = result.scalars().first()

    if not ticket:
        ticket = SupportTicket(user_id=current_user.id, subject=payload.subject, status=TicketStatus.OPEN)
        db.add(ticket)
        await db.flush()

    msg = SupportMessage(
        ticket_id=ticket.id,
        sender_type=SenderType.CUSTOMER,
        sender_id=current_user.id,
        message=payload.message,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(ticket, attribute_names=["messages"])

    return {"success": True, "data": _serialize_ticket(ticket, include_messages=True)}


@router.post("/tickets/{ticket_id}/messages", status_code=201)
async def add_my_message(
    ticket_id: str,
    payload: AddMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.id == ticket_id, SupportTicket.user_id == current_user.id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(400, "This conversation is closed. Start a new one.")

    msg = SupportMessage(
        ticket_id=ticket.id,
        sender_type=SenderType.CUSTOMER,
        sender_id=current_user.id,
        message=payload.message,
    )
    db.add(msg)
    # A new customer reply on a ticket the team already responded to reopens it.
    if ticket.status == TicketStatus.RESOLVED:
        ticket.status = TicketStatus.OPEN
    await db.flush()

    return {"success": True, "data": {
        "id": msg.id, "sender_type": "customer", "message": msg.message,
        "created_at": msg.created_at.isoformat(),
    }}
