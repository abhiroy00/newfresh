import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException
from app.services import cart_service, order_service


def item(name, active=True, price=10.0, qty=1):
    product = SimpleNamespace(id=f"p-{name}", name=name, unit="1kg", price=price,
                              primary_image_url=None, is_active=active)
    return SimpleNamespace(id=f"i-{name}", product_id=product.id, product=product,
                           quantity=qty, price_at_add=price)


class UnavailableCartItemTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = SimpleNamespace(delete=AsyncMock(), flush=AsyncMock(), commit=AsyncMock(), execute=AsyncMock())

    async def test_get_cart_drops_deactivated_products_from_items_and_total(self):
        cart = SimpleNamespace(id="c", items=[item("Peas", price=60), item("Chilli", active=False, price=1)])
        with patch.object(cart_service, "get_or_create_cart", AsyncMock(return_value=cart)):
            result = await cart_service.get_cart("u", self.db)
        self.assertEqual(result["removed_unavailable"], ["Chilli"])
        self.assertEqual([i["product"]["name"] for i in result["items"]], ["Peas"])
        self.assertEqual(result["subtotal"], 60)
        self.db.delete.assert_awaited_once()

    async def test_get_cart_with_only_available_items_is_unchanged(self):
        cart = SimpleNamespace(id="c", items=[item("Peas")])
        with patch.object(cart_service, "get_or_create_cart", AsyncMock(return_value=cart)):
            result = await cart_service.get_cart("u", self.db)
        self.assertEqual(result["removed_unavailable"], [])
        self.db.delete.assert_not_awaited()

    async def test_create_order_removes_unavailable_items_commits_and_names_them(self):
        cart = SimpleNamespace(id="c", items=[item("Peas"), item("Chilli", active=False)])
        self.db.execute.return_value = Mock()
        self.db.execute.return_value.scalar_one_or_none.return_value = SimpleNamespace(id="addr")
        payload = SimpleNamespace(address_id="addr", payment_method="cod", notes=None)
        with patch.object(order_service, "get_or_create_cart", AsyncMock(return_value=cart)):
            with self.assertRaises(HTTPException) as error:
                await order_service.create_order("u", payload, self.db)
        self.assertEqual(error.exception.status_code, 400)
        self.assertIn("'Chilli'", error.exception.detail)
        self.assertNotIn("p-Chilli", error.exception.detail)  # no raw ids
        # Committed before raising, so get_db's rollback can't undo the removal.
        self.db.commit.assert_awaited_once()
        self.assertEqual([i.product.name for i in cart.items], ["Peas"])


if __name__ == "__main__":
    unittest.main()
