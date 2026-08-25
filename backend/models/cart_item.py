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
        items, err = cls.add_many_for_user(user_id, [(product, quantity)])
        if err:
            return None, err
        return items[0], None

    @classmethod
    def add_many_for_user(cls, user_id, pairs):
        """Add several (product, quantity) pairs to the cart in one transaction.

        Returns (cart_items, error_message), the rows in first-seen product
        order. The batch is all-or-nothing: if any product would end up over
        MAX_QUANTITY nothing is written and cart_items is None.
        """
        rows = {i.product_id: i for i in cls.query.filter_by(user_id=user_id).all()}

        # Collapse repeats before checking the limit: two lines of 6 for the
        # same product must fail against a max of 10, not pass one at a time.
        wanted = {}
        for product, quantity in pairs:
            entry = wanted.get(product.id)
            if entry:
                entry[1] += quantity
            else:
                wanted[product.id] = [product, quantity]

        items = []
        for product_id, (product, quantity) in wanted.items():
            row = rows.get(product_id)
            new_qty = (row.quantity if row else 0) + quantity
            if new_qty > cls.MAX_QUANTITY:
                # Drop the bumps already staged on this session so a rejected
                # batch leaves the cart exactly as it was.
                db.session.rollback()
                return None, (
                    f"Max {cls.MAX_QUANTITY} units of a single product "
                    f"({product.name})"
                )

            if row:
                row.quantity = new_qty
            else:
                row = cls(user_id=user_id, product_id=product_id, quantity=new_qty)
                db.session.add(row)
            items.append(row)

        db.session.commit()
        return items, None
