# screens/home_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton, MDFlatButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivymd.uix.gridlayout import MDGridLayout
from kivymd.uix.chip import MDChip
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from datetime import datetime
from utils.data import AppState, CATEGORIES


class SnackCard(MDCard):
    def __init__(self, item, on_add, **kwargs):
        super().__init__(**kwargs)
        self.item = item
        self.radius = [dp(12)]
        self.padding = dp(12)
        self.elevation = 1
        self.size_hint_y = None
        self.height = dp(150)

        layout = MDBoxLayout(orientation="vertical", spacing=dp(4))

        # Emoji + name
        layout.add_widget(MDLabel(
            text=item["emoji"],
            font_size="28sp",
            size_hint_y=None,
            height=dp(36),
        ))
        layout.add_widget(MDLabel(
            text=item["name"],
            font_style="Subtitle2",
            theme_text_color="Primary",
            size_hint_y=None,
            height=dp(20),
        ))

        # Calories + freshness
        fresh_text = f"{item['calories']} kcal"
        if item["fresh"] > 0:
            fresh_text += f"  ·  {item['fresh']}m ago"
        layout.add_widget(MDLabel(
            text=fresh_text,
            font_size="11sp",
            theme_text_color="Secondary",
            size_hint_y=None,
            height=dp(16),
        ))

        # Price + Add button
        bottom = MDBoxLayout(orientation="horizontal", size_hint_y=None, height=dp(32))
        bottom.add_widget(MDLabel(
            text=f"₹{item['price']}",
            font_style="Subtitle1",
            theme_text_color="Custom",
            text_color=(0.114, 0.620, 0.459, 1),
            bold=True,
        ))
        add_btn = MDRaisedButton(
            text="+",
            size_hint=(None, None),
            size=(dp(36), dp(32)),
            md_bg_color=(0.114, 0.620, 0.459, 1),
            font_size="18sp",
        )
        add_btn.bind(on_release=lambda x: on_add(item))
        bottom.add_widget(add_btn)
        layout.add_widget(bottom)
        self.add_widget(layout)


class HomeScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "home"
        self.selected_category = "All"
        self.build_ui()

    def build_ui(self):
        self.clear_widgets()
        root = MDBoxLayout(orientation="vertical")

        # ── Top bar ──────────────────────────────────
        topbar = MDBoxLayout(
            orientation="horizontal",
            size_hint_y=None, height=dp(60),
            padding=[dp(16), dp(8)],
            spacing=dp(8),
            md_bg_color=(1, 1, 1, 1),
        )
        title_col = MDBoxLayout(orientation="vertical")
        title_col.add_widget(MDLabel(
            text="Cloud Snacks ☁️",
            font_style="H6",
            theme_text_color="Custom",
            text_color=(0.114, 0.620, 0.459, 1),
            size_hint_y=None, height=dp(30),
        ))
        title_col.add_widget(MDLabel(
            text="Hyderabad  ·  ~25 min delivery",
            font_size="11sp",
            theme_text_color="Secondary",
            size_hint_y=None, height=dp(18),
        ))
        topbar.add_widget(title_col)

        cart_count = AppState.cart_count()
        if cart_count > 0:
            cart_btn = MDRaisedButton(
                text=f"🛒 {cart_count}",
                md_bg_color=(0.114, 0.620, 0.459, 1),
                size_hint=(None, None),
                size=(dp(70), dp(36)),
            )
            cart_btn.bind(on_release=lambda x: self.go_to("cart"))
            topbar.add_widget(cart_btn)
        root.add_widget(topbar)

        # ── Scrollable content ────────────────────────
        scroll = MDScrollView()
        content = MDBoxLayout(
            orientation="vertical",
            padding=dp(16),
            spacing=dp(12),
            size_hint_y=None,
        )
        content.bind(minimum_height=content.setter("height"))

        # Greeting
        hour = datetime.now().hour
        greeting = "Good morning" if hour < 12 else "Good afternoon" if hour < 17 else "Good evening"
        first_name = AppState.user["name"].split()[0]
        content.add_widget(MDLabel(
            text=f"{greeting}, {first_name} 👋",
            font_style="H6",
            size_hint_y=None, height=dp(36),
        ))
        content.add_widget(MDLabel(
            text="What are you craving today?",
            font_size="13sp",
            theme_text_color="Secondary",
            size_hint_y=None, height=dp(20),
        ))

        # Streak bar
        streak = AppState.user["streak"]
        streak_card = MDCard(
            md_bg_color=(0.882, 0.961, 0.933, 1),
            radius=[dp(10)],
            padding=dp(12),
            size_hint_y=None, height=dp(48),
        )
        streak_card.add_widget(MDLabel(
            text=f"🔥  {streak}-day streak!  ·  {AppState.user['points']} points earned",
            font_size="13sp",
            theme_text_color="Custom",
            text_color=(0.031, 0.314, 0.251, 1),
        ))
        content.add_widget(streak_card)

        # My Usual
        if AppState.user["usual"]:
            usual_card = MDCard(
                radius=[dp(12)],
                padding=dp(12),
                elevation=1,
                size_hint_y=None, height=dp(72),
            )
            row = MDBoxLayout(orientation="horizontal", spacing=dp(12))
            row.add_widget(MDLabel(text="🥐", font_size="28sp", size_hint=(None, 1), width=dp(40)))
            info = MDBoxLayout(orientation="vertical")
            info.add_widget(MDLabel(text="My Usual", font_style="Subtitle1", bold=True, size_hint_y=None, height=dp(22)))
            info.add_widget(MDLabel(text="Your last order combo", font_size="12sp", theme_text_color="Secondary", size_hint_y=None, height=dp(18)))
            row.add_widget(info)
            reorder_btn = MDRaisedButton(
                text="Reorder",
                md_bg_color=(0.114, 0.620, 0.459, 1),
                size_hint=(None, None),
                size=(dp(90), dp(36)),
            )
            reorder_btn.bind(on_release=self.reorder_usual)
            row.add_widget(reorder_btn)
            usual_card.add_widget(row)
            content.add_widget(usual_card)

        # Subscribe banner
        sub_card = MDCard(
            md_bg_color=(0.882, 0.961, 0.933, 1),
            radius=[dp(12)],
            padding=dp(12),
            size_hint_y=None, height=dp(80),
        )
        sub_col = MDBoxLayout(orientation="vertical", spacing=dp(4))
        sub_col.add_widget(MDLabel(text="Subscribe & Save 20% 🎁", font_style="Subtitle1", bold=True,
                                    theme_text_color="Custom", text_color=(0.031, 0.314, 0.251, 1),
                                    size_hint_y=None, height=dp(22)))
        sub_col.add_widget(MDLabel(text="Daily snacks from ₹499/week  ·  Cancel anytime",
                                    font_size="12sp", theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(18)))
        sub_btn = MDFlatButton(text="View plans →",
                                theme_text_color="Custom", text_color=(0.114, 0.620, 0.459, 1),
                                size_hint_y=None, height=dp(28))
        sub_col.add_widget(sub_btn)
        sub_card.add_widget(sub_col)
        content.add_widget(sub_card)

        # Category chips
        content.add_widget(MDLabel(
            text="BROWSE BY CATEGORY",
            font_size="11sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(24),
        ))
        chip_row = BoxLayout(
            orientation="horizontal",
            spacing=dp(8),
            size_hint_y=None, height=dp(40),
        )
        for cat in CATEGORIES:
            chip = MDRaisedButton(
                text=cat,
                size_hint=(None, None),
                size=(dp(80), dp(34)),
                md_bg_color=(0.114, 0.620, 0.459, 1) if cat == self.selected_category else (0.95, 0.95, 0.95, 1),
                theme_text_color="Custom",
                text_color=(1, 1, 1, 1) if cat == self.selected_category else (0.4, 0.4, 0.4, 1),
                font_size="12sp",
            )
            chip.bind(on_release=lambda x, c=cat: self.filter_category(c))
            chip_row.add_widget(chip)
        content.add_widget(chip_row)

        # Snack grid
        content.add_widget(MDLabel(
            text="TODAY'S SPECIALS",
            font_size="11sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(24),
        ))
        self.grid = MDGridLayout(
            cols=2,
            spacing=dp(10),
            size_hint_y=None,
            adaptive_height=True,
        )
        self.populate_grid(AppState.get_menu(self.selected_category))
        content.add_widget(self.grid)

        scroll.add_widget(content)
        root.add_widget(scroll)
        self.add_widget(root)

    def populate_grid(self, items):
        self.grid.clear_widgets()
        for item in items:
            card = SnackCard(item, on_add=self.add_to_cart)
            self.grid.add_widget(card)

    def filter_category(self, category):
        self.selected_category = category
        self.build_ui()

    def add_to_cart(self, item):
        AppState.add_to_cart(item)
        self.build_ui()  # refresh cart count in header

    def reorder_usual(self, *args):
        from utils.data import MENU_ITEMS
        usual_ids = AppState.user["usual"]
        for item in MENU_ITEMS:
            if item["id"] in usual_ids:
                AppState.add_to_cart(item)
        self.go_to("cart")

    def go_to(self, screen_name):
        self.manager.current = screen_name

    def on_pre_enter(self):
        self.build_ui()
