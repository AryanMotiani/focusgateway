// Every avatar and room style option, the level it can be bought from and its price in coins.
// The option ids are the whole list of valid values for each field of `settings.room.avatar`
// and `settings.room.style` (see room.js), and the drawings live in apps/web/src/components/room/.
// No price means free: the starter set everyone owns. Build, skin tone, hijab, bald and
// textured hair are part of who someone is, so they are always free. The rest is sold in the
// shop (economy.js), common ones from level 1 and rarer ones behind a level as well.
// To add an option: add a line here and its drawing (or colour) in the web app.

/** Short label for each field, used for "Hairstyle: Afro" and the editor headings. */
export const OPTION_FIELDS = {
  build: 'Build',
  skin: 'Skin tone',
  hair: 'Hairstyle',
  hairColor: 'Hair colour',
  top: 'Top',
  topColor: 'Top colour',
  headphonesColor: 'Headphones',
  glassesStyle: 'Glasses',
  earrings: 'Earrings',
  wall: 'Wall colour',
  pattern: 'Wallpaper',
  floor: 'Floor',
  curtain: 'Curtains',
  wood: 'Wood tone',
  light: 'Lamp light',
  fairy: 'Fairy lights',
}

// [value, level, name, price], per field, in display order (price left out = free)
const CATALOG = {
  build: [
    ['neutral', 1, 'Neutral'],
    ['masc', 1, 'Broad'],
    ['fem', 1, 'Slim'],
  ],
  skin: [1, 2, 3, 4, 5, 6].map((n) => ['s' + n, 1, 'Tone ' + n]),
  hair: [
    ['short', 1, 'Short'],
    ['long', 1, 'Long'],
    ['ponytail', 1, 'Ponytail'],
    ['curly', 1, 'Curly'],
    ['afro', 1, 'Afro'],
    ['braids', 1, 'Box braids'],
    ['locs', 1, 'Locs'],
    ['hijab', 1, 'Hijab'],
    ['bald', 1, 'Bald'],
    ['buzz', 1, 'Buzz cut', 70],
    ['bun', 1, 'Bun', 90],
    ['bob', 1, 'Bob', 130],
    ['pixie', 1, 'Pixie', 150],
    ['wavy', 1, 'Long wavy', 190],
    ['sidepart', 1, 'Side part', 200],
    ['beanie', 10, 'Beanie', 225],
    ['buns', 12, 'Twin buns', 275],
    ['halfup', 13, 'Half up', 300],
    ['undercut', 15, 'Undercut', 325],
    ['cap', 17, 'Backwards cap', 375],
    ['mohawk', 22, 'Mohawk', 475],
    ['bandana', 28, 'Bandana', 600],
  ],
  hairColor: [
    ['black', 1, 'Black'],
    ['espresso', 1, 'Espresso'],
    ['brown', 1, 'Brown'],
    ['blonde', 1, 'Blonde'],
    ['auburn', 1, 'Auburn'],
    ['grey', 1, 'Grey'],
    ['copper', 1, 'Copper', 90],
    ['red', 1, 'Red', 170],
    ['platinum', 11, 'Platinum', 250],
    ['pink', 15, 'Pink', 325],
    ['blue', 18, 'Blue', 400],
    ['purple', 24, 'Purple', 500],
    ['teal', 30, 'Teal', 625],
    ['green', 35, 'Green', 725],
    ['white', 42, 'Snow white', 875],
  ],
  top: [
    ['hoodie', 1, 'Hoodie'],
    ['tshirt', 1, 'T-shirt'],
    ['sweater', 1, 'Sweater', 90],
    ['kurta', 1, 'Kurta', 130],
    ['stripes', 1, 'Striped tee', 190],
    ['turtleneck', 11, 'Turtleneck', 250],
    ['flannel', 16, 'Flannel shirt', 350],
    ['jacket', 20, 'Jacket', 425],
    ['varsity', 30, 'Varsity jacket', 625],
  ],
  topColor: [
    ['green', 1, 'Green'],
    ['navy', 1, 'Navy'],
    ['charcoal', 1, 'Charcoal'],
    ['cream', 1, 'Cream'],
    ['black', 1, 'Black', 70],
    ['maroon', 1, 'Maroon', 90],
    ['white', 1, 'White', 110],
    ['sky', 1, 'Sky', 130],
    ['mustard', 1, 'Mustard', 170],
    ['olive', 1, 'Olive', 200],
    ['red', 10, 'Red', 225],
    ['lavender', 12, 'Lavender', 275],
    ['teal', 14, 'Teal', 300],
    ['pink', 17, 'Pink', 375],
    ['orange', 19, 'Orange', 400],
    ['coral', 22, 'Coral', 475],
    ['purple', 26, 'Purple', 550],
  ],
  headphonesColor: [
    ['charcoal', 1, 'Charcoal'],
    ['white', 1, 'White', 130],
    ['pink', 1, 'Pink', 200],
    ['mint', 16, 'Mint', 350],
    ['red', 22, 'Red', 475],
    ['gold', 32, 'Gold', 675],
    ['blue', 42, 'Electric blue', 875],
  ],
  glassesStyle: [
    ['classic', 1, 'Classic'],
    ['round', 1, 'Round', 110],
    ['square', 14, 'Square', 300],
    ['tortoise', 38, 'Tortoiseshell', 800],
  ],
  earrings: [
    ['none', 1, 'None'],
    ['studs', 1, 'Studs'],
    ['hoops', 1, 'Hoops', 150],
    ['drops', 18, 'Pearl drops', 400],
  ],
  wall: [
    ['cream', 1, 'Cream'],
    ['sage', 1, 'Sage'],
    ['dusk', 1, 'Dusty blue'],
    ['blush', 1, 'Blush', 70],
    ['lavender', 1, 'Lavender', 150],
    ['butter', 1, 'Butter', 200],
    ['mint', 12, 'Mint', 275],
    ['terracotta', 16, 'Terracotta', 350],
    ['navy', 24, 'Midnight', 500],
    ['charcoal', 32, 'Charcoal', 675],
  ],
  pattern: [
    ['plain', 1, 'Plain'],
    ['dots', 1, 'Dots'],
    ['stripes', 1, 'Stripes', 90],
    ['plaid', 1, 'Plaid', 170],
    ['brick', 10, 'Brick', 225],
    ['panels', 14, 'Wood panels', 300],
    ['stars', 19, 'Stars', 400],
    ['botanical', 28, 'Botanical', 600],
  ],
  floor: [
    ['oak', 1, 'Oak'],
    ['birch', 1, 'Light wood', 110],
    ['walnut', 1, 'Walnut', 190],
    ['tiles', 13, 'Tiles', 300],
    ['carpet', 20, 'Carpet', 425],
    ['concrete', 32, 'Concrete', 675],
  ],
  curtain: [
    ['teal', 1, 'Teal'],
    ['mustard', 1, 'Mustard', 110],
    ['rose', 1, 'Rose', 170],
    ['navy', 11, 'Navy', 250],
    ['sage', 15, 'Sage', 325],
    ['plum', 19, 'Plum', 400],
    ['cream', 26, 'Linen', 550],
    ['charcoal', 35, 'Charcoal', 725],
  ],
  wood: [
    ['honey', 1, 'Honey'],
    ['walnut', 1, 'Walnut', 150],
    ['pale', 10, 'Pale oak', 225],
    ['cherry', 17, 'Cherry', 375],
    ['ebony', 28, 'Ebony', 600],
    ['white', 38, 'White painted', 800],
  ],
  light: [
    ['warm', 1, 'Warm'],
    ['soft', 1, 'Soft white', 70],
    ['cool', 1, 'Cool daylight', 190],
    ['pink', 13, 'Pink', 300],
    ['violet', 18, 'Violet', 400],
    ['green', 26, 'Green', 550],
    ['rgb', 46, 'Slow RGB', 950],
  ],
  fairy: [
    ['multi', 1, 'Multicolour'],
    ['warm', 15, 'Warm white', 325],
    ['pink', 20, 'Pink', 425],
    ['blue', 24, 'Ice blue', 500],
    ['green', 30, 'Green', 625],
    ['purple', 42, 'Purple', 875],
    ['rainbow', 50, 'Rainbow cycle', 1050],
  ],
}

export const OPTION_UNLOCKS = Object.entries(CATALOG).flatMap(([field, list]) =>
  list.map(([value, level, name, price = 0]) => ({ field, value, level, name, price })),
)

const BY_KEY = new Map(OPTION_UNLOCKS.map((o) => [o.field + ':' + o.value, o]))

/** Every option of a field, in display order: [{ field, value, level, name, price }]. */
export const optionsFor = (field) => OPTION_UNLOCKS.filter((o) => o.field === field)
/** The catalog entry for one option, or undefined if it is not a valid value. */
export const optionOf = (field, value) => BY_KEY.get(field + ':' + value)
/** True when `value` is a valid option for `field` and unlocked at `level`. */
export const isOptionUnlocked = (field, value, level) => {
  const o = BY_KEY.get(field + ':' + value)
  return !!o && o.level <= level
}
/** "Hairstyle: Afro" */
export const optionLabel = (o) => `${OPTION_FIELDS[o.field] || o.field}: ${o.name}`
