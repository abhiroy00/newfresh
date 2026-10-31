import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from app.services.product_service import attach_like_counts


class LikeCountTests(unittest.IsolatedAsyncioTestCase):
    async def test_counts_attached_and_unliked_products_get_zero(self):
        rows = Mock()
        rows.all.return_value = [("p1", 3)]
        db = SimpleNamespace(execute=AsyncMock(return_value=rows))
        p1, p2 = SimpleNamespace(id="p1"), SimpleNamespace(id="p2")
        await attach_like_counts([p1, p2], db)
        self.assertEqual((p1.like_count, p2.like_count), (3, 0))
        db.execute.assert_awaited_once()  # one grouped query for the whole page

    async def test_empty_list_makes_no_query(self):
        db = SimpleNamespace(execute=AsyncMock())
        await attach_like_counts([], db)
        db.execute.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
