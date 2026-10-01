"""Product model — one row per item in the shop."""

from database import db


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    tag = db.Column(db.String(50), nullable=False)  # the product's category
    # Path relative to the frontend root, e.g. "images/products/cotton-kurta.svg".
    image_url = db.Column(db.String(255))
    description = db.Column(db.String(500))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "tag": self.tag,
            "image_url": self.image_url,
            "description": self.description,
        }
