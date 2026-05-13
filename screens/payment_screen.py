# screens/payment_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivy.metrics import dp
from utils.payments import (
    create_order, verify_payment, mock_payment_complete,
    get_payment_methods, format_payment_for_display
)
from utils.data import AppState

GREEN = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)


class PaymentScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "payment"
        self.selected_method = "upi"
        self.order_amount = 0
        self.order_id = ""
        self.rzp_order = None
        self.build_ui()

    def set_order(self, order_id, amount):
        self.order_id = order_id
        self.order_amount = amount
        self.rzp_order = create_order(
            amount,
            order_id,
            AppState.user["name"],
            AppState.user["email"],
        )
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
        back_btn = MDRaisedButton(
            text="← Back",
            md_bg_color=(0.95, 0.95, 0.95, 1),
            theme_text_color="Custom",
            text_color=(0.2, 0.2, 0.2, 1),
            size_hint=(None, None), size=(dp(80), dp(36)),
        )
        back_btn.bind(on_release=lambda x: setattr(self.manager, "current", "cart"))
        topbar.add_widget(back_btn)
        topbar.add_widget(MDLabel(
            text="Secure Payment 🔒",
            font_style="H6",
            theme_text_color="Custom",
            text_color=GREEN,
            halign="center",
        ))
        root.add_widget(topbar)

        scroll = MDScrollView()
        content = MDBoxLayout(
            orientation="vertical",
            padding=dp(16), spacing=dp(12),
            size_hint_y=None,
        )
        content.bind(minimum_height=content.setter("height"))

        # Amount summary
        amount_card = MDCard(
            md_bg_color=GREEN_LIGHT,
            radius=[dp(12)], padding=dp(16),
            size_hint_y=None, height=dp(80),
        )
        col = MDBoxLayout(orientation="vertical")
        col.add_widget(MDLabel(
            text="Amount to pay",
            font_size="13sp", theme_text_color="Custom",
            text_color=(0.031, 0.314, 0.251, 1),
            size_hint_y=None, height=dp(20),
        ))
        col.add_widget(MDLabel(
            text=format_payment_for_display(self.order_amount),
            font_style="H4", bold=True,
            theme_text_color="Custom", text_color=GREEN,
            size_hint_y=None, height=dp(44),
        ))
        amount_card.add_widget(col)
        content.add_widget(amount_card)

        # Razorpay badge
        content.add_widget(MDLabel(
            text="🔒  Secured by Razorpay  ·  PCI-DSS compliant",
            font_size="12sp", theme_text_color="Secondary",
            halign="center", size_hint_y=None, height=dp(24),
        ))

        # Payment methods
        content.add_widget(MDLabel(
            text="SELECT PAYMENT METHOD",
            font_size="11sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(24),
        ))

        methods = get_payment_methods()
        for method in methods:
            is_selected = method["id"] == self.selected_method
            m_card = MDCard(
                radius=[dp(10)],
                padding=dp(14),
                elevation=2 if is_selected else 1,
                size_hint_y=None, height=dp(68),
                md_bg_color=(0.882, 0.961, 0.933, 1) if is_selected else (1, 1, 1, 1),
            )
            row = MDBoxLayout(orientation="horizontal", spacing=dp(12))

            # Radio indicator
            radio = MDLabel(
                text="●" if is_selected else "○",
                font_size="18sp",
                theme_text_color="Custom",
                text_color=GREEN if is_selected else (0.7, 0.7, 0.7, 1),
                size_hint=(None, 1), width=dp(24),
            )
            row.add_widget(radio)
            row.add_widget(MDLabel(
                text=method["icon"],
                font_size="24sp",
                size_hint=(None, 1), width=dp(36),
            ))
            info = MDBoxLayout(orientation="vertical")
            info.add_widget(MDLabel(
                text=method["label"] + (" ⭐ Popular" if method["popular"] else ""),
                font_style="Subtitle1", bold=True,
                size_hint_y=None, height=dp(24),
            ))
            info.add_widget(MDLabel(
                text=method["desc"],
                font_size="12sp", theme_text_color="Secondary",
                size_hint_y=None, height=dp(18),
            ))
            row.add_widget(info)
            m_card.add_widget(row)
            m_card.bind(on_touch_down=lambda touch, mid=method["id"], c=m_card:
                        self._select_method(touch, mid, c))
            content.add_widget(m_card)

        # UPI ID input (shown when UPI selected)
        if self.selected_method == "upi":
            upi_card = MDCard(
                radius=[dp(10)], padding=dp(14),
                size_hint_y=None, height=dp(80),
            )
            upi_col = MDBoxLayout(orientation="vertical", spacing=dp(8))
            upi_col.add_widget(MDLabel(
                text="Enter UPI ID (or scan QR at delivery)",
                font_size="12sp", theme_text_color="Secondary",
                size_hint_y=None, height=dp(18),
            ))
            from kivymd.uix.textfield import MDTextField
            upi_field = MDTextField(
                hint_text="yourname@upi",
                font_size="14sp",
                size_hint_y=None, height=dp(48),
                mode="rectangle",
            )
            upi_col.add_widget(upi_field)
            upi_card.add_widget(upi_col)
            content.add_widget(upi_card)

        # Pay button
        pay_btn = MDRaisedButton(
            text=f"Pay {format_payment_for_display(self.order_amount)}  →",
            md_bg_color=GREEN,
            size_hint_y=None, height=dp(52),
            font_size="16sp",
        )
        pay_btn.bind(on_release=self.process_payment)
        content.add_widget(pay_btn)

        content.add_widget(MDLabel(
            text="By paying you agree to our Terms of Service.\nYour payment info is never stored on our servers.",
            font_size="11sp", theme_text_color="Secondary",
            halign="center", size_hint_y=None, height=dp(40),
        ))

        scroll.add_widget(content)
        root.add_widget(scroll)
        self.add_widget(root)

    def _select_method(self, touch, method_id, card):
        if card.collide_point(*touch.pos):
            self.selected_method = method_id
            self.build_ui()

    def process_payment(self, *args):
        """Handle payment — mock mode simulates instant success"""
        if not self.rzp_order:
            return

        # In mock mode — simulate payment success instantly
        result = mock_payment_complete(self.rzp_order["razorpay_order_id"])

        # Verify payment signature (server-side in production)
        is_valid = verify_payment(
            result["razorpay_order_id"],
            result["razorpay_payment_id"],
            result["razorpay_signature"],
        )

        if is_valid:
            # Update order with payment details
            for order in AppState.orders:
                if order["id"] == self.order_id:
                    order["payment_id"] = result["razorpay_payment_id"]
                    order["payment_method"] = self.selected_method
                    order["status"] = "confirmed"
                    break

            # Navigate to success screen
            self.manager.get_screen("success").set_order(self.order_id)
            self.manager.current = "success"
        else:
            # Show error (in real app, show a dialog)
            print("Payment verification failed")

    def on_pre_enter(self):
        self.build_ui()
