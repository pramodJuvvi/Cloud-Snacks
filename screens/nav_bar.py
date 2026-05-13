# screens/nav_bar.py
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.button import MDFlatButton
from kivymd.uix.label import MDLabel
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout

GREEN = (0.114, 0.620, 0.459, 1)
GRAY  = (0.6, 0.6, 0.6, 1)

TABS = [
    ("🏠", "Home",    "home"),
    ("🍽️", "Menu",    "home"),   # menu reuses home with category focus
    ("🛒", "Cart",    "cart"),
    ("👤", "Profile", "profile"),
    ("⚙️", "Admin",   "admin"),
]


class BottomNavBar(MDBoxLayout):
    def __init__(self, screen_manager, **kwargs):
        super().__init__(**kwargs)
        self.sm = screen_manager
        self.orientation = "horizontal"
        self.size_hint_y = None
        self.height = dp(60)
        self.md_bg_color = (1, 1, 1, 1)
        self._build()

    def _build(self):
        self.clear_widgets()
        current = self.sm.current if self.sm else "home"

        for icon, label, target in TABS:
            is_active = current == target
            col = MDBoxLayout(orientation="vertical", spacing=0,
                               padding=[0, dp(4)])
            col.add_widget(MDLabel(
                text=icon,
                font_size="20sp",
                halign="center",
                size_hint_y=None, height=dp(28),
            ))
            col.add_widget(MDLabel(
                text=label,
                font_size="10sp",
                halign="center",
                theme_text_color="Custom",
                text_color=GREEN if is_active else GRAY,
                size_hint_y=None, height=dp(16),
            ))
            col.bind(on_touch_down=lambda touch, t=target, c=col:
                     self._on_tab(touch, t, c))
            self.add_widget(col)

    def _on_tab(self, touch, target, col):
        if col.collide_point(*touch.pos):
            self.sm.current = target
            self._build()
