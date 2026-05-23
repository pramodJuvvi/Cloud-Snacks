const snackImages: Record<string, number> = {
  "Aloo Paratha Dippers": require("../../assets/snacks/aloo-paratha-dippers-real.jpg"),
  "Bagara Rice": require("../../assets/snacks/bagara-rice-real.jpg"),
  "Chicken Curry": require("../../assets/snacks/chicken-curry-real.jpg"),
  "Chole Kulcha Pocket": require("../../assets/snacks/chole-kulcha-pocket-real.jpg"),
  "Cocoa Date Laddoo": require("../../assets/snacks/cocoa-date-laddoo-real.jpg"),
  "Curd Rice Comfort Cup": require("../../assets/snacks/curd-rice-comfort-cup-real.jpg"),
  "Filter Coffee Shot": require("../../assets/snacks/filter-coffee-shot-real.jpg"),
  "Fruit Chaat Cup": require("../../assets/snacks/fruit-chaat-cup-real.jpg"),
  "Masala Chai Flask": require("../../assets/snacks/masala-chai-flask-real.jpg"),
  "Masala Cloud Popcorn": require("../../assets/snacks/masala-cloud-popcorn-real.jpg"),
  "Masala Dosa Roll": require("../../assets/snacks/masala-dosa-roll-real.jpg"),
  "Medu Vada Minis": require("../../assets/snacks/medu-vada-minis-real.jpg"),
  "Millet Upma Cup": require("../../assets/snacks/millet-upma-cup-real.jpg"),
  "Mini Idli Podi Box": require("../../assets/snacks/mini-idli-podi-box-real.jpg"),
  "Paneer Tikka Skewers": require("../../assets/snacks/paneer-tikka-skewers-real.jpg"),
  "Protein Chikki Bites": require("../../assets/snacks/protein-chikki-bites-real.jpg"),
  "Rajma Rice Bowl": require("../../assets/snacks/rajma-rice-bowl-real.jpg"),
  "Sprouts Bhel Jar": require("../../assets/snacks/sprouts-bhel-jar-real.jpg"),
};

export function getSnackImage(name: string) {
  return snackImages[name];
}
