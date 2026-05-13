# screens/profile_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivy.metrics import dp
from utils.data import AppState

GREEN = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)
AMBER_LIGHT = (0.980, 0.933, 0.851, 1)


class ProfileScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "profile"
        self.build_ui()

    def build_ui(self):
        self.clear_widgets()
        root = MDBoxLayout(orientation="vertical")
        u = AppState.user

        # Profile header
        header = MDCard(md_bg_color=GREEN_LIGHT, radius=[0], padding=dp(20),
                         size_hint_y=None, height=dp(90))
        hrow = MDBoxLayout(orientation="horizontal", spacing=dp(14))
        avatar = MDCard(md_bg_color=GREEN, radius=[dp(28)],
                         size_hint=(None, None), size=(dp(56), dp(56)))
        avatar.add_widget(MDLabel(
            text=u["name"][0],
            font_style="H5", bold=True,
            theme_text_color="Custom", text_color=(1, 1, 1, 1),
            halign="center", valign="middle",
        ))
        hrow.add_widget(avatar)
        info = MDBoxLayout(orientation="vertical")
        info.add_widget(MDLabel(text=u["name"], font_style="H6", bold=True,
                                 theme_text_color="Custom", text_color=(0.031, 0.314, 0.251, 1),
                                 size_hint_y=None, height=dp(28)))
        info.add_widget(MDLabel(
            text=f"{u['points']} points  ·  {u['streak']}-day streak  ·  Gold tier",
            font_size="12sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(20),
        ))
        hrow.add_widget(info)
        header.add_widget(hrow)
        root.add_widget(header)

        scroll = MDScrollView()
        content = MDBoxLayout(orientation="vertical", padding=dp(16), spacing=dp(12),
                               size_hint_y=None)
        content.bind(minimum_height=content.setter("height"))

        # Stats
        stats_row = MDBoxLayout(orientation="horizontal", spacing=dp(10),
                                 size_hint_y=None, height=dp(80))
        for val, lbl in [(len(AppState.orders), "Orders"),
                          (u["points"], "Points"),
                          (u["streak"], "Streak")]:
            card = MDCard(radius=[dp(10)], padding=dp(10), elevation=1)
            col = MDBoxLayout(orientation="vertical")
            col.add_widget(MDLabel(text=str(val), font_style="H5", bold=True,
                                    halign="center", size_hint_y=None, height=dp(36)))
            col.add_widget(MDLabel(text=lbl, font_size="11sp", theme_text_color="Secondary",
                                    halign="center", size_hint_y=None, height=dp(20)))
            card.add_widget(col)
            stats_row.add_widget(card)
        content.add_widget(stats_row)

        # Preferences
        content.add_widget(MDLabel(text="PREFERENCES", font_size="11sp",
                                    theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(24)))
        prefs = [
            ("🥗", "Diet preference", u["diet"]),
            ("🌶️", "Spice level", u["spice"]),
            ("📍", "Address", u["address"][:30] + "..."),
        ]
        for icon, label, value in prefs:
            row_card = MDCard(radius=[dp(8)], padding=dp(12), elevation=0,
                               size_hint_y=None, height=dp(52),
                               md_bg_color=(0.97, 0.97, 0.97, 1))
            row = MDBoxLayout(orientation="horizontal", spacing=dp(10))
            row.add_widget(MDLabel(text=icon, font_size="18sp",
                                    size_hint=(None, 1), width=dp(28)))
            row.add_widget(MDLabel(text=label, font_size="13sp",
                                    theme_text_color="Primary"))
            row.add_widget(MDLabel(text=value, font_size="12sp",
                                    theme_text_color="Secondary", halign="right"))
            row_card.add_widget(row)
            content.add_widget(row_card)

        # Referral card
        content.add_widget(MDLabel(text="REFERRAL CODE", font_size="11sp",
                                    theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(24)))
        ref_card = MDCard(md_bg_color=AMBER_LIGHT, radius=[dp(10)], padding=dp(14),
                           size_hint_y=None, height=dp(64))
        ref_col = MDBoxLayout(orientation="vertical")
        ref_col.add_widget(MDLabel(text=u["referral"], font_style="H5", bold=True,
                                    theme_text_color="Custom",
                                    text_color=(0.729, 0.459, 0.090, 1),
                                    size_hint_y=None, height=dp(32)))
        ref_col.add_widget(MDLabel(text="Share to earn ₹50 per friend",
                                    font_size="12sp", theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(20)))
        ref_card.add_widget(ref_col)
        content.add_widget(ref_card)

        # Recent orders
        content.add_widget(MDLabel(text="RECENT ORDERS", font_size="11sp",
                                    theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(24)))
        for order in AppState.orders[:4]:
            o_card = MDCard(radius=[dp(10)], padding=dp(12), elevation=1,
                             size_hint_y=None, height=dp(80))
            col = MDBoxLayout(orientation="vertical", spacing=dp(6))
            top_row = MDBoxLayout(orientation="horizontal")
            top_row.add_widget(MDLabel(text=f"#{order['id']}", font_style="Subtitle1",
                                        bold=True, size_hint_y=None, height=dp(22)))
            status_color = GREEN if order["status"] == "delivered" else (0.729, 0.459, 0.090, 1)
            top_row.add_widget(MDLabel(text=order["status"].capitalize(),
                                        font_size="12sp", theme_text_color="Custom",
                                        text_color=status_color, halign="right",
                                        size_hint_y=None, height=dp(22)))
            col.add_widget(top_row)
            items_text = "  ·  ".join([f"{i['name']} ×{i['qty']}" for i in order["items"]])
            col.add_widget(MDLabel(text=items_text, font_size="12sp",
                                    theme_text_color="Secondary", size_hint_y=None, height=dp(18)))
            col.add_widget(MDLabel(text=f"₹{order['total']}  ·  {order.get('date', '')}",
                                    font_size="12sp", bold=True,
                                    size_hint_y=None, height=dp(18)))
            o_card.add_widget(col)
            content.add_widget(o_card)

        scroll.add_widget(content)
        root.add_widget(scroll)
        self.add_widget(root)

    def on_pre_enter(self):
        self.build_ui()
