# screens/success_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivy.metrics import dp

GREEN = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)


class SuccessScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "success"
        self.order_id = ""
        self._build()

    def set_order(self, order_id):
        self.order_id = order_id
        self._build()

    def _build(self):
        self.clear_widgets()
        root = MDBoxLayout(
            orientation="vertical",
            padding=dp(32),
            spacing=dp(20),
        )

        root.add_widget(MDBoxLayout(size_hint_y=0.15))

        root.add_widget(MDLabel(
            text="✅",
            font_size="64sp",
            halign="center",
            size_hint_y=None,
            height=dp(90),
        ))

        root.add_widget(MDLabel(
            text="Order Placed!",
            font_style="H4",
            bold=True,
            halign="center",
            size_hint_y=None,
            height=dp(52),
        ))

        root.add_widget(MDLabel(
            text=f"Order #{self.order_id} is confirmed.\nYour snacks are being freshly prepared 🍽️",
            font_size="14sp",
            theme_text_color="Secondary",
            halign="center",
            size_hint_y=None,
            height=dp(56),
        ))

        eta_card = MDCard(
            md_bg_color=GREEN_LIGHT,
            radius=[dp(14)],
            padding=dp(20),
            size_hint_y=None,
            height=dp(80),
        )
        col = MDBoxLayout(orientation="vertical")
        col.add_widget(MDLabel(
            text="Estimated delivery",
            font_size="13sp",
            theme_text_color="Custom",
            text_color=(0.031, 0.314, 0.251, 1),
            bold=True,
            halign="center",
            size_hint_y=None,
            height=dp(22),
        ))
        col.add_widget(MDLabel(
            text="~25 minutes",
            font_style="H5",
            bold=True,
            theme_text_color="Custom",
            text_color=GREEN,
            halign="center",
            size_hint_y=None,
            height=dp(40),
        ))
        eta_card.add_widget(col)
        root.add_widget(eta_card)

        home_btn = MDRaisedButton(
            text="Back to Home",
            md_bg_color=GREEN,
            size_hint_y=None,
            height=dp(52),
            font_size="16sp",
        )
        home_btn.bind(on_release=lambda x: setattr(self.manager, "current", "home"))
        root.add_widget(home_btn)

        root.add_widget(MDBoxLayout(size_hint_y=0.2))
        self.add_widget(root)
