# main.py — Cloud Snacks · Python Android App
# Built with KivyMD — pure Python, no Java
# Run locally: python main.py
# Build APK:   buildozer android debug

from kivymd.app import MDApp
from kivymd.uix.screenmanager import MDScreenManager
from kivy.uix.boxlayout import BoxLayout        # plain, no md_bg_color
from kivy.core.window import Window
from kivy.metrics import dp

from screens.widgets import ColorBox             # safe coloured container

from screens.login_screen   import LoginScreen
from screens.home_screen    import HomeScreen
from screens.cart_screen    import CartScreen
from screens.profile_screen import ProfileScreen
from screens.admin_screen   import AdminScreen
from screens.success_screen import SuccessScreen
from screens.payment_screen import PaymentScreen
from screens.deals_screen   import DealsScreen
from screens.map_screen     import MapScreen

Window.size = (390, 760)

GREEN = (0.114, 0.620, 0.459, 1)
GRAY  = (0.6, 0.6, 0.6, 1)

TABS = [
    ("🏠", "Home",    "home"),
    ("⚡", "Deals",   "deals"),
    ("🛒", "Cart",    "cart"),
    ("📍", "Address", "map"),
    ("👤", "Profile", "profile"),
]

HIDE_NAV = {"login", "success", "payment", "admin"}


class CloudSnacksApp(MDApp):

    def build(self):
        self.theme_cls.primary_palette = "Green"
        self.theme_cls.primary_hue     = "600"
        self.theme_cls.accent_palette  = "Teal"
        self.theme_cls.theme_style     = "Light"
        self.title = "Cloud Snacks"

        # Plain BoxLayout as root — no md_bg_color needed here
        root = BoxLayout(orientation="vertical")

        self.sm = MDScreenManager()
        self.sm.add_widget(LoginScreen())
        self.sm.add_widget(HomeScreen())
        self.sm.add_widget(CartScreen())
        self.sm.add_widget(ProfileScreen())
        self.sm.add_widget(AdminScreen())
        self.sm.add_widget(SuccessScreen())
        self.sm.add_widget(PaymentScreen())
        self.sm.add_widget(DealsScreen())
        self.sm.add_widget(MapScreen())
        self.sm.current = "login"

        root.add_widget(self.sm)

        self.nav = self._build_nav()
        root.add_widget(self.nav)

        self.sm.bind(current=self.on_screen_change)
        return root

    def _build_nav(self):
        # ColorBox instead of MDBoxLayout(md_bg_color=...)
        nav = ColorBox(
            color=(1, 1, 1, 1),
            orientation="horizontal",
            size_hint_y=None, height=dp(60),
        )
        for icon, label, target in TABS:
            is_active = self.sm.current == target
            col = BoxLayout(orientation="vertical", spacing=0, padding=[0, dp(4)])
            from kivymd.uix.label import MDLabel
            col.add_widget(MDLabel(
                text=icon, font_size="22sp", halign="center",
                size_hint_y=None, height=dp(30),
            ))
            col.add_widget(MDLabel(
                text=label, font_size="10sp", halign="center",
                theme_text_color="Custom",
                text_color=GREEN if is_active else GRAY,
                size_hint_y=None, height=dp(16),
            ))
            col.bind(on_touch_down=lambda touch, t=target, c=col:
                     self._tab_tap(touch, t, c))
            nav.add_widget(col)
        return nav

    def _tab_tap(self, touch, target, col):
        if col.collide_point(*touch.pos):
            self.sm.current = target

    def on_screen_change(self, instance, value):
        hide = value in HIDE_NAV or value == "login"
        self.nav.height   = 0     if hide else dp(60)
        self.nav.opacity  = 0     if hide else 1
        self.nav.disabled = hide
        self.nav.clear_widgets()
        if not hide:
            for icon, label, target in TABS:
                is_active = value == target
                col = BoxLayout(orientation="vertical", spacing=0, padding=[0, dp(4)])
                from kivymd.uix.label import MDLabel
                col.add_widget(MDLabel(
                    text=icon, font_size="22sp", halign="center",
                    size_hint_y=None, height=dp(30),
                ))
                col.add_widget(MDLabel(
                    text=label, font_size="10sp", halign="center",
                    theme_text_color="Custom",
                    text_color=GREEN if is_active else GRAY,
                    size_hint_y=None, height=dp(16),
                ))
                col.bind(on_touch_down=lambda touch, t=target, c=col:
                         self._tab_tap(touch, t, c))
                self.nav.add_widget(col)


if __name__ == "__main__":
    CloudSnacksApp().run()
