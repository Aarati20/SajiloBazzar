"""Order model — one row per placed order.

The `create_from_cart` classmethod bundles the cart-empty / minimum-total /
delete-cart-rows logic so `app.py` stays thin.
"""

from datetime import datetime, timezone

from database import db

from .cart_item import CartItem


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    address = db.Column(db.String(500), nullable=False)
    payment_method = db.Column(db.String(20), nullable=False)  # esewa | khalti | cod
    total = db.Column(db.Float, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    VALID_METHODS = ("esewa", "khalti", "cod")
    MIN_TOTAL = 100

    @classmethod
    def create_from_cart(cls, user_id, address, payment_method):
        """Build an Order from the user's cart. Returns (order, error_message)."""
        if payment_method not in cls.VALID_METHODS:
            return None, f"Payment method must be one of {cls.VALID_METHODS}"
        if not address:
            return None, "Address is required"

        items = CartItem.query.filter_by(user_id=user_id).all()
        if not items:
            return None, "Cart is empty"

        total = sum(i.line_total for i in items)
        if total < cls.MIN_TOTAL:
            return None, f"Minimum order value is Rs {cls.MIN_TOTAL}"

        order = cls(
            user_id=user_id,
            address=address,
            payment_method=payment_method,
            total=total,
        )
        db.session.add(order)
        for i in items:
            db.session.delete(i)
        db.session.commit()
        return order, None

    def to_dict(self):
        return {
            "id": self.id,
            "address": self.address,
            "payment_method": self.payment_method,
            "total": self.total,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
