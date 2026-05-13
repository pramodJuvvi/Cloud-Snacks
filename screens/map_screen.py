# screens/map_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivymd.uix.textfield import MDTextField
from kivy.metrics import dp
from kivy.clock import Clock
from utils.maps import (
    autocomplete_address, get_delivery_eta,
    calculate_delivery_fee, KITCHEN_ADDRESS
)
from utils.data import AppState

GREEN       = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)


class MapScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "map"
        self.suggestions = []
        self.selected_address = AppState.user.get("address", "")
        self.eta_info = None
        self._debounce = None
        self.build_ui()

    def build_ui(self):
        self.clear_widgets()
        root = MDBoxLayout(orientation="vertical")

        # Top bar
        topbar = MDBoxLayout(
            size_hint_y=None, height=dp(56),
            padding=[dp(16), dp(8)],
            md_bg_color=(1, 1, 1, 1),
        )
        back_btn = MDRaisedButton(
            text="← Back",
            md_bg_color=(0.95, 0.95, 0.95, 1),
            theme_text_color="Custom", text_color=(0.2, 0.2, 0.2, 1),
            size_hint=(None, None), size=(dp(80), dp(36)),
        )
        back_btn.bind(on_release=lambda x: setattr(self.manager, "current", "cart"))
        topbar.add_widget(back_btn)
        topbar.add_widget(MDLabel(
            text="📍  Delivery Location",
            font_style="H6",
            theme_text_color="Custom", text_color=GREEN,
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

        # Kitchen info
        kitchen_card = MDCard(
            md_bg_color=GREEN_LIGHT, radius=[dp(10)],
            padding=dp(12), size_hint_y=None, height=dp(60),
        )
        row = MDBoxLayout(orientation="horizontal", spacing=dp(10))
        row.add_widget(MDLabel(text="🏪", font_size="24sp",
                                size_hint=(None, 1), width=dp(32)))
        info = MDBoxLayout(orientation="vertical")
        info.add_widget(MDLabel(text="Cloud Snacks Kitchen", font_style="Subtitle1", bold=True,
                                 theme_text_color="Custom", text_color=(0.031, 0.314, 0.251, 1),
                                 size_hint_y=None, height=dp(22)))
        info.add_widget(MDLabel(text=KITCHEN_ADDRESS, font_size="12sp",
                                 theme_text_color="Secondary", size_hint_y=None, height=dp(18)))
        row.add_widget(info)
        kitchen_card.add_widget(row)
        content.add_widget(kitchen_card)

        # Address search
        content.add_widget(MDLabel(
            text="YOUR DELIVERY ADDRESS",
            font_size="11sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(24),
        ))

        self.addr_field = MDTextField(
            hint_text="Search your address...",
            text=self.selected_address,
            font_size="14sp",
            size_hint_y=None, height=dp(52),
            mode="rectangle",
        )
        self.addr_field.bind(text=self.on_address_type)
        content.add_widget(self.addr_field)

        # Suggestions dropdown
        if self.suggestions:
            sug_card = MDCard(
                radius=[dp(8)], padding=dp(4),
                elevation=3, size_hint_y=None,
                height=dp(len(self.suggestions) * 48 + 8),
            )
            sug_col = MDBoxLayout(orientation="vertical", spacing=dp(2))
            for sug in self.suggestions:
                sug_btn = MDRaisedButton(
                    text=f"📍  {sug['description'][:50]}",
                    md_bg_color=(1, 1, 1, 1),
                    theme_text_color="Custom",
                    text_color=(0.2, 0.2, 0.2, 1),
                    size_hint_y=None, height=dp(44),
                    font_size="13sp",
                    elevation=0,
                )
                sug_btn.bind(on_release=lambda x, s=sug: self.select_suggestion(s))
                sug_col.add_widget(sug_btn)
            sug_card.add_widget(sug_col)
            content.add_widget(sug_card)

        # ETA info
        if self.eta_info:
            eta_card = MDCard(
                radius=[dp(12)], padding=dp(14),
                elevation=1, size_hint_y=None, height=dp(100),
            )
            eta_col = MDBoxLayout(orientation="vertical", spacing=dp(6))

            row1 = MDBoxLayout(orientation="horizontal")
            row1.add_widget(MDLabel(text="🛵  Estimated delivery",
                                    font_style="Subtitle1", bold=True,
                                    size_hint_y=None, height=dp(24)))
            row1.add_widget(MDLabel(
                text=self.eta_info["eta_text"],
                font_style="H6", bold=True,
                theme_text_color="Custom", text_color=GREEN,
                halign="right", size_hint_y=None, height=dp(24),
            ))
            eta_col.add_widget(row1)

            row2 = MDBoxLayout(orientation="horizontal")
            row2.add_widget(MDLabel(
                text=f"Distance: {self.eta_info['distance_km']} km from kitchen",
                font_size="13sp", theme_text_color="Secondary",
                size_hint_y=None, height=dp(20),
            ))
            fee = calculate_delivery_fee(self.eta_info["distance_km"])
            fee_text = "Free delivery ✅" if fee == 0 else f"Delivery fee: ₹{fee}"
            row2.add_widget(MDLabel(
                text=fee_text,
                font_size="13sp",
                theme_text_color="Custom",
                text_color=GREEN if fee == 0 else (0.7, 0.4, 0.1, 1),
                halign="right", size_hint_y=None, height=dp(20),
            ))
            eta_col.add_widget(row2)

            # Map placeholder (in real app: load static map image via URL)
            map_placeholder = MDCard(
                md_bg_color=(0.92, 0.96, 0.93, 1),
                radius=[dp(8)], size_hint_y=None, height=dp(40),
            )
            map_placeholder.add_widget(MDLabel(
                text="🗺️   Route map  ·  Kitchen → Your location",
                font_size="12sp", theme_text_color="Secondary",
                halign="center",
            ))
            eta_col.add_widget(map_placeholder)
            eta_card.add_widget(eta_col)
            content.add_widget(eta_card)

        # Saved addresses
        content.add_widget(MDLabel(
            text="SAVED LOCATIONS",
            font_size="11sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(24),
        ))

        saved = [
            ("🏠", "Home",   "Flat 4B, Silicon Towers, Gachibowli"),
            ("🏢", "Office", "HITEC City, Block B, Floor 3"),
        ]
        for icon, label, addr in saved:
            s_card = MDCard(
                radius=[dp(8)], padding=dp(12),
                size_hint_y=None, height=dp(56),
            )
            s_row = MDBoxLayout(orientation="horizontal", spacing=dp(10))
            s_row.add_widget(MDLabel(text=icon, font_size="20sp",
                                      size_hint=(None, 1), width=dp(28)))
            s_col = MDBoxLayout(orientation="vertical")
            s_col.add_widget(MDLabel(text=label, font_style="Subtitle2", bold=True,
                                      size_hint_y=None, height=dp(20)))
            s_col.add_widget(MDLabel(text=addr, font_size="12sp",
                                      theme_text_color="Secondary",
                                      size_hint_y=None, height=dp(16)))
            s_row.add_widget(s_col)
            s_card.add_widget(s_row)
            s_card.bind(on_touch_down=lambda touch, a=addr, c=s_card:
                        self.quick_select(touch, a, c))
            content.add_widget(s_card)

        # Confirm button
        if self.selected_address and self.eta_info:
            confirm_btn = MDRaisedButton(
                text="Confirm Delivery Location  ✓",
                md_bg_color=GREEN,
                size_hint_y=None, height=dp(52),
                font_size="15sp",
            )
            confirm_btn.bind(on_release=self.confirm_address)
            content.add_widget(confirm_btn)

        scroll.add_widget(content)
        root.add_widget(scroll)
        self.add_widget(root)

    def on_address_type(self, instance, text):
        """Debounced address search — waits 300ms after typing stops"""
        if self._debounce:
            self._debounce.cancel()
        self._debounce = Clock.schedule_once(lambda dt: self.search_address(text), 0.3)

    def search_address(self, text):
        if len(text) >= 3:
            self.suggestions = autocomplete_address(text)
        else:
            self.suggestions = []
        self.build_ui()

    def select_suggestion(self, suggestion):
        self.selected_address = suggestion["description"]
        self.suggestions = []
        # Get ETA for selected address (mock returns random coords)
        self.eta_info = get_delivery_eta(17.44, 78.38)
        self.build_ui()

    def quick_select(self, touch, address, card):
        if card.collide_point(*touch.pos):
            self.selected_address = address
            self.suggestions = []
            self.eta_info = get_delivery_eta(17.44, 78.38)
            self.build_ui()

    def confirm_address(self, *args):
        AppState.user["address"] = self.selected_address
        if self.eta_info:
            AppState.user["delivery_eta"] = self.eta_info["eta_text"]
        self.manager.current = "cart"

    def on_pre_enter(self):
        self.build_ui()
