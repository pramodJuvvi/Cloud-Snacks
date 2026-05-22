from sqlalchemy import inspect, text

from app.database import engine


def ensure_order_user_id_column() -> None:
    inspector = inspect(engine)

    if "orders" not in inspector.get_table_names():
        return

    order_columns = {column["name"] for column in inspector.get_columns("orders")}
    if "user_id" in order_columns:
        pass
    else:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)"))

    nullable_text_columns = {
        "customer_phone": "VARCHAR",
        "delivery_address": "VARCHAR",
        "delivery_note": "VARCHAR",
        "scheduled_for": "VARCHAR",
        "spice_level": "VARCHAR",
        "payment_method": "VARCHAR",
        "coupon_code": "VARCHAR",
        "delivery_partner": "VARCHAR",
        "feedback_note": "VARCHAR",
        "issue_report": "VARCHAR",
    }

    refreshed_columns = {column["name"] for column in inspect(engine).get_columns("orders")}
    with engine.begin() as connection:
        for column_name, column_type in nullable_text_columns.items():
            if column_name not in refreshed_columns:
                connection.execute(text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}"))
        if "discount" not in refreshed_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN discount FLOAT DEFAULT 0 NOT NULL"))
        if "feedback_rating" not in refreshed_columns:
            connection.execute(text("ALTER TABLE orders ADD COLUMN feedback_rating INTEGER"))


def ensure_snack_detail_columns() -> None:
    inspector = inspect(engine)

    if "snacks" not in inspector.get_table_names():
        return

    snack_columns = {column["name"] for column in inspector.get_columns("snacks")}
    detail_columns = {
        "ingredients": "VARCHAR DEFAULT ''",
        "allergens": "VARCHAR DEFAULT ''",
        "is_available": "BOOLEAN DEFAULT TRUE NOT NULL",
    }

    with engine.begin() as connection:
        for column_name, column_type in detail_columns.items():
            if column_name not in snack_columns:
                connection.execute(text(f"ALTER TABLE snacks ADD COLUMN {column_name} {column_type}"))


def ensure_user_phone_column() -> None:
    inspector = inspect(engine)

    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "phone" in user_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR UNIQUE"))
