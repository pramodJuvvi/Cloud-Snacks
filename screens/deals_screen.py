# screens/deals_screen.py
from kivymd.uix.screen import MDScreen
from kivymd.uix.boxlayout import MDBoxLayout
from kivymd.uix.label import MDLabel
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivymd.uix.scrollview import MDScrollView
from kivy.metrics import dp
from kivy.clock import Clock
from utils.engagement import get_flash_deals, format_countdown, spin_wheel, SPIN_PRIZES
from utils.data import AppState, MENU_ITEMS

GREEN       = (0.114, 0.620, 0.459, 1)
GREEN_LIGHT = (0.882, 0.961, 0.933, 1)
AMBER       = (0.729, 0.459, 0.090, 1)
AMBER_LIGHT = (0.980, 0.933, 0.851, 1)
RED         = (0.886, 0.298, 0.298, 1)
RED_LIGHT   = (0.988, 0.922, 0.922, 1)


class DealsScreen(MDScreen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "deals"
        self.spin_result = None
        self.spun_today = False
        self.countdown_event = None
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
        topbar.add_widget(MDLabel(
            text="Deals & Rewards ⚡",
            font_style="H6",
            theme_text_color="Custom", text_color=GREEN,
        ))
        root.add_widget(topbar)

        scroll = MDScrollView()
        content = MDBoxLayout(
            orientation="vertical",
            padding=dp(16), spacing=dp(16),
            size_hint_y=None,
        )
        content.bind(minimum_height=content.setter("height"))

        # ── Flash deals ──────────────────────────────────────
        content.add_widget(MDLabel(
            text="⚡  FLASH DEALS — Grab before they're gone!",
            font_size="13sp", bold=True,
            theme_text_color="Custom", text_color=RED,
            size_hint_y=None, height=dp(28),
        ))

        for deal in get_flash_deals():
            urgency_color = RED_LIGHT if deal["urgency"] == "high" else AMBER_LIGHT
            urgency_border = RED if deal["urgency"] == "high" else AMBER

            deal_card = MDCard(
                md_bg_color=urgency_color,
                radius=[dp(14)],
                padding=dp(14),
                elevation=2,
                size_hint_y=None, height=dp(130),
            )
            col = MDBoxLayout(orientation="vertical", spacing=dp(6))

            # Title + countdown
            top = MDBoxLayout(orientation="horizontal")
            top.add_widget(MDLabel(
                text=f"{deal['emoji']}  {deal['item_name']}",
                font_style="Subtitle1", bold=True,
                size_hint_y=None, height=dp(24),
            ))
            countdown = format_countdown(deal["expires_min"])
            top.add_widget(MDLabel(
                text=f"⏱ {countdown}",
                font_size="14sp", bold=True,
                theme_text_color="Custom",
                text_color=RED if deal["urgency"] == "high" else AMBER,
                halign="right", size_hint_y=None, height=dp(24),
            ))
            col.add_widget(top)

            # Price row
            price_row = MDBoxLayout(orientation="horizontal", size_hint_y=None, height=dp(30))
            price_row.add_widget(MDLabel(
                text=f"₹{deal['deal_price']}",
                font_style="H6", bold=True,
                theme_text_color="Custom", text_color=GREEN,
            ))
            price_row.add_widget(MDLabel(
                text=f"  ₹{deal['original']}",
                font_size="13sp",
                theme_text_color="Secondary",
            ))
            price_row.add_widget(MDLabel(
                text=f"  Save {deal['savings']}%  🏷",
                font_size="12sp", bold=True,
                theme_text_color="Custom", text_color=GREEN,
            ))
            col.add_widget(price_row)

            # Progress bar (spots claimed)
            bar_row = MDBoxLayout(orientation="horizontal", spacing=dp(8),
                                   size_hint_y=None, height=dp(22))
            spots_text = f"{deal['spots_left']} spots left of {deal['total']}"
            bar_row.add_widget(MDLabel(
                text=spots_text, font_size="11sp",
                theme_text_color="Secondary",
            ))
            col.add_widget(bar_row)

            # Grab button
            grab_btn = MDRaisedButton(
                text=f"Grab Deal  ·  ₹{deal['deal_price']}",
                md_bg_color=GREEN,
                size_hint_y=None, height=dp(36),
                font_size="13sp",
            )
            grab_btn.bind(on_release=lambda x, d=deal: self.grab_deal(d))
            col.add_widget(grab_btn)

            deal_card.add_widget(col)
            content.add_widget(deal_card)

        # ── Spin the wheel ───────────────────────────────────
        content.add_widget(MDLabel(
            text="🎡  DAILY SPIN — Free reward every day!",
            font_size="13sp", bold=True,
            theme_text_color="Custom", text_color=AMBER,
            size_hint_y=None, height=dp(28),
        ))

        spin_card = MDCard(
            md_bg_color=AMBER_LIGHT,
            radius=[dp(14)], padding=dp(16),
            elevation=2, size_hint_y=None, height=dp(200),
        )
        spin_col = MDBoxLayout(orientation="vertical", spacing=dp(12), padding=dp(8))

        # Prize display
        prizes_row = MDBoxLayout(orientation="horizontal", spacing=dp(6),
                                  size_hint_y=None, height=dp(60))
        for prize in SPIN_PRIZES[:4]:
            p_card = MDCard(
                radius=[dp(8)], padding=dp(6),
                size_hint_y=None, height=dp(56),
                md_bg_color=(1, 1, 1, 0.7),
            )
            p_col = MDBoxLayout(orientation="vertical")
            p_col.add_widget(MDLabel(
                text=prize["label"],
                font_size="11sp", bold=True,
                halign="center",
                theme_text_color="Custom", text_color=AMBER,
                size_hint_y=None, height=dp(28),
            ))
            p_card.add_widget(p_col)
            prizes_row.add_widget(p_card)
        spin_col.add_widget(prizes_row)

        # Result display
        if self.spin_result:
            result_label = MDLabel(
                text=f"🎉  You won: {self.spin_result['label']}!",
                font_style="Subtitle1", bold=True,
                theme_text_color="Custom", text_color=GREEN,
                halign="center", size_hint_y=None, height=dp(32),
            )
            spin_col.add_widget(result_label)

        # Spin button
        if self.spun_today:
            spin_col.add_widget(MDLabel(
                text="Come back tomorrow for your next spin!",
                font_size="13sp", theme_text_color="Secondary",
                halign="center", size_hint_y=None, height=dp(28),
            ))
        else:
            spin_btn = MDRaisedButton(
                text="🎡  Spin Now — It's Free!",
                md_bg_color=AMBER,
                size_hint_y=None, height=dp(44),
                font_size="14sp",
            )
            spin_btn.bind(on_release=self.do_spin)
            spin_col.add_widget(spin_btn)

        spin_card.add_widget(spin_col)
        content.add_widget(spin_card)

        # ── Referral section ─────────────────────────────────
        content.add_widget(MDLabel(
            text="👥  REFER FRIENDS — Earn ₹50 each",
            font_size="13sp", bold=True,
            theme_text_color="Custom", text_color=GREEN,
            size_hint_y=None, height=dp(28),
        ))

        ref_card = MDCard(
            md_bg_color=GREEN_LIGHT, radius=[dp(12)],
            padding=dp(14), size_hint_y=None, height=dp(110),
        )
        ref_col = MDBoxLayout(orientation="vertical", spacing=dp(8))
        ref_col.add_widget(MDLabel(
            text=f"Your code:  {AppState.user['referral']}",
            font_style="H6", bold=True,
            theme_text_color="Custom", text_color=GREEN,
            size_hint_y=None, height=dp(32),
        ))
        ref_col.add_widget(MDLabel(
            text="Share with friends → they get ₹50 off, you get ₹50 credit",
            font_size="12sp", theme_text_color="Secondary",
            size_hint_y=None, height=dp(20),
        ))
        share_btn = MDRaisedButton(
            text="Share referral code  📤",
            md_bg_color=GREEN,
            size_hint_y=None, height=dp(36),
        )
        share_btn.bind(on_release=self.share_referral)
        ref_col.add_widget(share_btn)
        ref_card.add_widget(ref_col)
        content.add_widget(ref_card)

        scroll.add_widget(content)
        root.add_widget(scroll)
        self.add_widget(root)

    def grab_deal(self, deal):
        """Add deal items to cart at deal price"""
        for item_id in deal["item_ids"]:
            item = next((i for i in MENU_ITEMS if i["id"] == item_id), None)
            if item:
                deal_item = item.copy()
                deal_item["price"] = deal["deal_price"] // len(deal["item_ids"])
                AppState.add_to_cart(deal_item)
        self.manager.current = "cart"

    def do_spin(self, *args):
        """Spin the wheel and show result"""
        self.spin_result = spin_wheel()
        self.spun_today = True

        # Apply coupon to user state
        if self.spin_result["value"]:
            AppState.user["active_coupon"] = self.spin_result["value"]

        self.build_ui()

    def share_referral(self, *args):
        from utils.engagement import generate_referral_message
        msg = generate_referral_message(AppState.user["name"], AppState.user["referral"])
        print(f"Share: {msg}")  # In real app: open share dialog / clipboard

    def on_pre_enter(self):
        self.build_ui()
