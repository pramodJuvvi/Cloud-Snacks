# screens/login_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivy.metrics import dp
import os

GREEN       = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)
GREEN_DARK  = (0.031, 0.314, 0.251, 1)


class LoginScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name  = "login"
        self.md_bg_color = GREEN_LIGHT
        self._build()

    def _build(self):
        root = MDBoxLayout(orientation="vertical", padding=dp(32), spacing=dp(0))
        root.add_widget(MDBoxLayout(size_hint_y=0.15))

        card = MDCard(
            orientation="vertical",
            radius=[dp(24)],
            padding=dp(28),
            elevation=6,
            size_hint_y=None,
            height=dp(420),
        )
        col = MDBoxLayout(orientation="vertical", spacing=dp(12))

        # Logo image — show if file exists, else fallback emoji
        logo_path = os.path.join(os.path.dirname(__file__),
                                  '..', 'assets', 'icon.png')
        if os.path.exists(logo_path):
            from kivy.uix.image import Image as KivyImage
            logo = KivyImage(
                source=logo_path,
                size_hint=(None, None),
                size=(dp(120), dp(120)),
                pos_hint={"center_x": 0.5},
            )
            col.add_widget(logo)
        else:
            col.add_widget(MDLabel(
                text="☁️",
                font_size="56sp",
                halign="center",
                size_hint_y=None,
                height=dp(80),
            ))

        # App name
        col.add_widget(MDLabel(
            text="CloudSnacks",
            font_style="H4",
            bold=True,
            theme_text_color="Custom",
            text_color=GREEN,
            halign="center",
            size_hint_y=None,
            height=dp(44),
        ))

        # Tagline from logo: Pure • Fresh • Tasty
        col.add_widget(MDLabel(
            text="Pure  •  Fresh  •  Tasty",
            font_size="14sp",
            theme_text_color="Custom",
            text_color=GREEN_DARK,
            halign="center",
            size_hint_y=None,
            height=dp(24),
        ))

        # Trust badges
        col.add_widget(MDLabel(
            text="🌿 Natural   🛡️ Hygienic   🍲 Cooked   💚 Wholesome",
            font_size="11sp",
            theme_text_color="Secondary",
            halign="center",
            size_hint_y=None,
            height=dp(24),
        ))

        # Divider space
        col.add_widget(MDBoxLayout(size_hint_y=None, height=dp(8)))

        # Sign in button
        sign_in_btn = MDRaisedButton(
            text="🔐   Sign in with Google",
            md_bg_color=GREEN,
            size_hint_y=None,
            height=dp(52),
            font_size="15sp",
        )
        sign_in_btn.bind(on_release=self.sign_in)
        col.add_widget(sign_in_btn)

        # Demo note
        col.add_widget(MDLabel(
            text="Demo mode — tap to sign in instantly",
            font_size="11sp",
            theme_text_color="Secondary",
            halign="center",
            size_hint_y=None,
            height=dp(22),
        ))

        card.add_widget(col)
        root.add_widget(card)
        root.add_widget(MDBoxLayout(size_hint_y=0.25))
        self.add_widget(root)

    def sign_in(self, *args):
        self.manager.current = "home"
