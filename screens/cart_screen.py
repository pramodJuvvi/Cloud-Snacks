# screens/cart_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton, MDFlatButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivy.metrics import dp
from utils.data import AppState

SLOTS = ["Now · ~25 min", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"]
GREEN = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)


class CartScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "cart"
        self.selected_slot = 0
        self.build_ui()

    def build_ui(self):
        self.clear_widgets()
        root = MDBoxLayout(orientation="vertical")

        # Top bar
        topbar = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None, height=dp(56),
            padding=[dp(16), dp(8)],
            md_bg_color=(1, 1, 1, 1),
        )
        topbar.add_widget(MDLabel(text="Your Cart 🛒", font_style="H6", theme_text_color="Custom", text_color=GREEN))
        count = AppState.cart_count()
        topbar.add_widget(MDLabel(
            text=f"{count} item{'s' if count != 1 else ''}",
            font_size="13sp", theme_text_color="Secondary",
            halign="right",
        ))
        root.add_widget(topbar)

        if not AppState.cart:
            # Empty cart
            empty = MDBoxLayout(orientation="vertical", padding=dp(40), spacing=dp(16))
            empty.add_widget(MDLabel(text="🛒", font_size="56sp", halign="center", size_hint_y=None, height=dp(80)))
            empty.add_widget(MDLabel(text="Your cart is empty", font_style="H6",
                                      theme_text_color="Secondary", halign="center",
                                      size_hint_y=None, height=dp(40)))
            go_btn = MDRaisedButton(text="Browse Menu", md_bg_color=GREEN,
                                     size_hint=(None, None), size=(dp(160), dp(44)),
                                     pos_hint={"center_x": 0.5})
            go_btn.bind(on_release=lambda x: self.go_to("home"))
            empty.add_widget(go_btn)
            root.add_widget(empty)
        else:
            scroll = MDScrollView()
            content = MDBoxLayout(
                orientation="vertical",
                padding=dp(16), spacing=dp(10),
                size_hint_y=None,
            )
            content.bind(minimum_height=content.setter("height"))

            # Cart items
            for item_id, entry in AppState.cart.items():
                item = entry["item"]
                qty = entry["qty"]
                card = MDCard(radius=[dp(10)], padding=dp(12), elevation=1,
                               size_hint_y=None, height=dp(72))
                row = MDBoxLayout(orientation="horizontal", spacing=dp(10))

                info = MDBoxLayout(orientation="vertical")
                info.add_widget(MDLabel(text=f"{item['emoji']}  {item['name']}",
                                         font_style="Subtitle1", bold=True,
                                         size_hint_y=None, height=dp(24)))
                info.add_widget(MDLabel(text=f"₹{item['price']} each",
                                         font_size="12sp", theme_text_color="Custom",
                                         text_color=GREEN, size_hint_y=None, height=dp(18)))
                row.add_widget(info)

                # Qty controls
                qty_row = MDBoxLayout(orientation="horizontal", spacing=dp(8),
                                       size_hint=(None, None), size=(dp(100), dp(36)))
                minus_btn = MDRaisedButton(text="−", size_hint=(None, None),
                                            size=(dp(32), dp(32)),
                                            md_bg_color=(0.95, 0.95, 0.95, 1),
                                            theme_text_color="Custom",
                                            text_color=(0.2, 0.2, 0.2, 1))
                minus_btn.bind(on_release=lambda x, iid=item_id: self.remove_item(iid))
                qty_row.add_widget(minus_btn)
                qty_row.add_widget(MDLabel(text=str(qty), halign="center",
                                            size_hint=(None, None), size=(dp(24), dp(32)),
                                            font_style="Subtitle1", bold=True))
                plus_btn = MDRaisedButton(text="+", size_hint=(None, None),
                                           size=(dp(32), dp(32)), md_bg_color=GREEN)
                plus_btn.bind(on_release=lambda x, i=item: self.add_item(i))
                qty_row.add_widget(plus_btn)
                row.add_widget(qty_row)
                card.add_widget(row)
                content.add_widget(card)

            # Delivery slot
            content.add_widget(MDLabel(text="DELIVERY SLOT", font_size="11sp",
                                        theme_text_color="Secondary",
                                        size_hint_y=None, height=dp(28)))
            for i, slot in enumerate(SLOTS):
                is_selected = i == self.selected_slot
                slot_btn = MDRaisedButton(
                    text=slot,
                    md_bg_color=GREEN if is_selected else (0.95, 0.95, 0.95, 1),
                    theme_text_color="Custom",
                    text_color=(1, 1, 1, 1) if is_selected else (0.5, 0.5, 0.5, 1),
                    size_hint_y=None, height=dp(40),
                )
                slot_btn.bind(on_release=lambda x, idx=i: self.select_slot(idx))
                content.add_widget(slot_btn)

            # Order summary
            summary = MDCard(md_bg_color=(0.97, 0.97, 0.97, 1),
                              radius=[dp(10)], padding=dp(14),
                              size_hint_y=None, height=dp(100))
            col = MDBoxLayout(orientation="vertical", spacing=dp(6))
            subtotal = AppState.cart_total()
            row1 = MDBoxLayout(orientation="horizontal")
            row1.add_widget(MDLabel(text="Subtotal", font_size="13sp", theme_text_color="Secondary"))
            row1.add_widget(MDLabel(text=f"₹{subtotal}", font_size="13sp",
                                     theme_text_color="Secondary", halign="right"))
            row2 = MDBoxLayout(orientation="horizontal")
            row2.add_widget(MDLabel(text="Delivery", font_size="13sp", theme_text_color="Secondary"))
            row2.add_widget(MDLabel(text="FREE", font_size="13sp", theme_text_color="Custom",
                                     text_color=GREEN, halign="right", bold=True))
            row3 = MDBoxLayout(orientation="horizontal")
            row3.add_widget(MDLabel(text="Total", font_style="Subtitle1", bold=True))
            row3.add_widget(MDLabel(text=f"₹{subtotal}", font_style="Subtitle1",
                                     bold=True, halign="right"))
            col.add_widget(row1)
            col.add_widget(row2)
            col.add_widget(row3)
            summary.add_widget(col)
            content.add_widget(summary)

            # Eco badge
            eco = MDCard(md_bg_color=GREEN_LIGHT, radius=[dp(8)],
                          padding=dp(10), size_hint_y=None, height=dp(40))
            eco.add_widget(MDLabel(
                text="♻️  Eco-friendly packaging  ·  Zero plastic",
                font_size="12sp", theme_text_color="Custom",
                text_color=(0.031, 0.314, 0.251, 1),
            ))
            content.add_widget(eco)

            # Place order button
            place_btn = MDRaisedButton(
                text=f"Place Order  ·  ₹{AppState.cart_total()}",
                md_bg_color=GREEN,
                size_hint_y=None, height=dp(52),
                font_size="16sp",
            )
            place_btn.bind(on_release=self.place_order)
            content.add_widget(place_btn)

            scroll.add_widget(content)
            root.add_widget(scroll)

        self.add_widget(root)

    def add_item(self, item):
        AppState.add_to_cart(item)
        self.build_ui()

    def remove_item(self, item_id):
        AppState.remove_from_cart(item_id)
        self.build_ui()

    def select_slot(self, idx):
        self.selected_slot = idx
        self.build_ui()

    def place_order(self, *args):
        slot = SLOTS[self.selected_slot]
        order_id = AppState.place_order(slot)
        self.manager.current = "success"
        self.manager.get_screen("success").set_order(order_id)

    def go_to(self, name):
        self.manager.current = name

    def on_pre_enter(self):
        self.build_ui()
