"""CartItem model — one row per (user, product) pair in a user's cart."""

from database import db


class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    # SQLAlchemy loads the linked Product row lazily when we access .product
    product = db.relationship("Product")

    MAX_QUANTITY = 10

    @property
    def line_total(self):
        """price * quantity for this row."""
        return self.product.price * self.quantity

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.product.name,
            "price": self.product.price,
            "quantity": self.quantity,
            "line_total": self.line_total,
        }

    @classmethod
    def add_for_user(cls, user_id, product, quantity):
        """Add `quantity` of `product` to the user's cart, or bump an existing row.

        Returns (cart_item, error_message). If the max-per-product limit is
        exceeded, cart_item is None.
        """
        existing = cls.query.filter_by(user_id=user_id, product_id=product.id).first()
        new_qty = (existing.quantity if existing else 0) + quantity
        if new_qty > cls.MAX_QUANTITY:
            return None, f"Max {cls.MAX_QUANTITY} units of a single product"

        if existing:
            existing.quantity = new_qty
            item = existing
        else:
            item = cls(user_id=user_id, product_id=product.id, quantity=new_qty)
            db.session.add(item)
        db.session.commit()
        return item, None
