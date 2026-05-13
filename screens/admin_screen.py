# screens/admin_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivy.metrics import dp
from utils.data import AppState

GREEN = (0.114, 0.620, 0.459, 1)
AMBER_LIGHT = (0.980, 0.933, 0.851, 1)
AMBER_TEXT = (0.259, 0.141, 0.008, 1)


class AdminScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "admin"
        self.build_ui()

    def build_ui(self):
        self.clear_widgets()
        root = MDBoxLayout(orientation="vertical")

        # Header
        header = MDCard(md_bg_color=GREEN, radius=[0], padding=[dp(16), dp(12)],
                         size_hint_y=None, height=dp(64))
        hrow = MDBoxLayout(orientation="horizontal")
        col = MDBoxLayout(orientation="vertical")
        col.add_widget(MDLabel(text="Admin Dashboard ⚙️", font_style="H6",
                                theme_text_color="Custom", text_color=(1, 1, 1, 1),
                                size_hint_y=None, height=dp(28)))
        col.add_widget(MDLabel(text="Live order management",
                                font_size="12sp", theme_text_color="Custom",
                                text_color=(0.624, 0.882, 0.792, 1),
                                size_hint_y=None, height=dp(18)))
        hrow.add_widget(col)
        refresh_btn = MDRaisedButton(
            text="↻ Refresh",
            md_bg_color=(1, 1, 1, 0.2),
            size_hint=(None, None), size=(dp(90), dp(36)),
        )
        refresh_btn.bind(on_release=lambda x: self.build_ui())
        hrow.add_widget(refresh_btn)
        header.add_widget(hrow)
        root.add_widget(header)

        scroll = MDScrollView()
        content = MDBoxLayout(orientation="vertical", padding=dp(16), spacing=dp(12),
                               size_hint_y=None)
        content.bind(minimum_height=content.setter("height"))

        # Today stats
        total_rev = sum(o["total"] for o in AppState.orders)
        live_orders = [o for o in AppState.orders if o["status"] != "delivered"]

        stats_row = MDBoxLayout(orientation="horizontal", spacing=dp(10),
                                 size_hint_y=None, height=dp(80))
        for val, lbl in [(len(AppState.orders), "Orders today"),
                          (f"₹{total_rev}", "Revenue"),
                          (len(live_orders), "Active")]:
            card = MDCard(radius=[dp(10)], padding=dp(10), elevation=1)
            col2 = MDBoxLayout(orientation="vertical")
            col2.add_widget(MDLabel(text=str(val), font_style="H5", bold=True,
                                     halign="center", size_hint_y=None, height=dp(36)))
            col2.add_widget(MDLabel(text=lbl, font_size="11sp",
                                     theme_text_color="Secondary", halign="center",
                                     size_hint_y=None, height=dp(20)))
            card.add_widget(col2)
            stats_row.add_widget(card)
        content.add_widget(stats_row)

        # Inventory alerts
        if AppState.inventory_alerts:
            content.add_widget(MDLabel(text="⚠️  INVENTORY ALERTS", font_size="11sp",
                                        theme_text_color="Secondary",
                                        size_hint_y=None, height=dp(24)))
            for alert in AppState.inventory_alerts:
                a_card = MDCard(md_bg_color=AMBER_LIGHT, radius=[dp(8)],
                                 padding=dp(12), size_hint_y=None, height=dp(44))
                a_card.add_widget(MDLabel(
                    text=f"{alert['item']}  —  only {alert['stock']} units left",
                    font_size="13sp", theme_text_color="Custom", text_color=AMBER_TEXT,
                ))
                content.add_widget(a_card)

        # Live orders
        content.add_widget(MDLabel(text="LIVE ORDERS", font_size="11sp",
                                    theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(24)))

        STATUS_FLOW = ["placed", "confirmed", "preparing", "ready", "delivered"]
        STATUS_COLORS = {
            "placed":    (0.400, 0.400, 0.400, 1),
            "confirmed": (0.114, 0.620, 0.459, 1),
            "preparing": (0.729, 0.459, 0.090, 1),
            "ready":     (0.114, 0.420, 0.859, 1),
            "delivered": (0.114, 0.620, 0.459, 1),
        }

        active_orders = [o for o in AppState.orders if o["status"] != "delivered"]
        if not active_orders:
            content.add_widget(MDLabel(
                text="No active orders right now ✅",
                theme_text_color="Secondary", halign="center",
                size_hint_y=None, height=dp(40),
            ))
        for order in active_orders:
            o_card = MDCard(radius=[dp(10)], padding=dp(12), elevation=1,
                             size_hint_y=None, height=dp(100))
            col3 = MDBoxLayout(orientation="vertical", spacing=dp(6))
            top = MDBoxLayout(orientation="horizontal")
            top.add_widget(MDLabel(text=f"#{order['id']}", font_style="Subtitle1", bold=True,
                                    size_hint_y=None, height=dp(22)))
            sc = order["status"]
            top.add_widget(MDLabel(
                text=sc.upper(),
                font_size="11sp", theme_text_color="Custom",
                text_color=STATUS_COLORS.get(sc, (0.4, 0.4, 0.4, 1)),
                halign="right", bold=True, size_hint_y=None, height=dp(22),
            ))
            col3.add_widget(top)
            items_text = "  ·  ".join([f"{i['name']} ×{i['qty']}" for i in order["items"]])
            col3.add_widget(MDLabel(text=items_text, font_size="12sp",
                                     theme_text_color="Secondary",
                                     size_hint_y=None, height=dp(18)))
            bottom_row = MDBoxLayout(orientation="horizontal", size_hint_y=None, height=dp(36))
            bottom_row.add_widget(MDLabel(text=f"₹{order['total']}", font_style="Subtitle1",
                                           bold=True, size_hint_y=None, height=dp(22)))
            idx = STATUS_FLOW.index(sc)
            if idx < len(STATUS_FLOW) - 1:
                next_status = STATUS_FLOW[idx + 1]
                adv_btn = MDRaisedButton(
                    text=f"→ {next_status}",
                    md_bg_color=GREEN,
                    size_hint=(None, None), size=(dp(120), dp(34)),
                    font_size="12sp",
                )
                adv_btn.bind(on_release=lambda x, oid=order["id"]: self.advance(oid))
                bottom_row.add_widget(adv_btn)
            col3.add_widget(bottom_row)
            o_card.add_widget(col3)
            content.add_widget(o_card)

        # Demand forecast
        content.add_widget(MDLabel(text="AI DEMAND FORECAST · TOMORROW", font_size="11sp",
                                    theme_text_color="Secondary",
                                    size_hint_y=None, height=dp(24)))
        forecast_card = MDCard(radius=[dp(10)], padding=dp(14), elevation=1,
                                size_hint_y=None,
                                height=dp(len(AppState.demand_forecast) * 36 + 16))
        fc = MDBoxLayout(orientation="vertical", spacing=dp(6))
        for item_name, qty in AppState.demand_forecast.items():
            row = MDBoxLayout(orientation="horizontal", size_hint_y=None, height=dp(26))
            row.add_widget(MDLabel(text=item_name, font_size="13sp"))
            row.add_widget(MDLabel(text=f"~{qty} units", font_size="13sp",
                                    theme_text_color="Custom", text_color=GREEN,
                                    halign="right", bold=True))
            fc.add_widget(row)
        forecast_card.add_widget(fc)
        content.add_widget(forecast_card)

        scroll.add_widget(content)
        root.add_widget(scroll)
        self.add_widget(root)

    def advance(self, order_id):
        AppState.advance_order_status(order_id)
        self.build_ui()

    def on_pre_enter(self):
        self.build_ui()
