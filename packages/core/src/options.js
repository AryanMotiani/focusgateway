// Every avatar and room style option, and the level it unlocks at. The option ids are the
// whole list of valid values for each field of `settings.room.avatar` and
// `settings.room.style` (see room.js), and the drawings live in apps/web/src/components/room/.
// Level 1 is the free starter set. Build, skin tone, hijab, bald and textured hair are part of
// who someone is, so they are always free. Everything else unlocks from level 2 to 50,
// dense early and sparse late (a steady user reaches level 14 in about 200 days).
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

// [value, level, name], per field, in display order
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
    ['buzz', 2, 'Buzz cut'],
    ['bun', 3, 'Bun'],
    ['bob', 5, 'Bob'],
    ['pixie', 6, 'Pixie'],
    ['wavy', 8, 'Long wavy'],
    ['sidepart', 9, 'Side part'],
    ['beanie', 10, 'Beanie'],
    ['buns', 12, 'Twin buns'],
    ['halfup', 13, 'Half up'],
    ['undercut', 15, 'Undercut'],
    ['cap', 17, 'Backwards cap'],
    ['mohawk', 22, 'Mohawk'],
    ['bandana', 28, 'Bandana'],
  ],
  hairColor: [
    ['black', 1, 'Black'],
    ['espresso', 1, 'Espresso'],
    ['brown', 1, 'Brown'],
    ['blonde', 1, 'Blonde'],
    ['auburn', 1, 'Auburn'],
    ['grey', 1, 'Grey'],
    ['copper', 3, 'Copper'],
    ['red', 7, 'Red'],
    ['platinum', 11, 'Platinum'],
    ['pink', 15, 'Pink'],
    ['blue', 18, 'Blue'],
    ['purple', 24, 'Purple'],
    ['teal', 30, 'Teal'],
    ['green', 35, 'Green'],
    ['white', 42, 'Snow white'],
  ],
  top: [
    ['hoodie', 1, 'Hoodie'],
    ['tshirt', 1, 'T-shirt'],
    ['sweater', 3, 'Sweater'],
    ['kurta', 5, 'Kurta'],
    ['stripes', 8, 'Striped tee'],
    ['turtleneck', 11, 'Turtleneck'],
    ['flannel', 16, 'Flannel shirt'],
    ['jacket', 20, 'Jacket'],
    ['varsity', 30, 'Varsity jacket'],
  ],
  topColor: [
    ['green', 1, 'Green'],
    ['navy', 1, 'Navy'],
    ['charcoal', 1, 'Charcoal'],
    ['cream', 1, 'Cream'],
    ['black', 2, 'Black'],
    ['maroon', 3, 'Maroon'],
    ['white', 4, 'White'],
    ['sky', 5, 'Sky'],
    ['mustard', 7, 'Mustard'],
    ['olive', 9, 'Olive'],
    ['red', 10, 'Red'],
    ['lavender', 12, 'Lavender'],
    ['teal', 14, 'Teal'],
    ['pink', 17, 'Pink'],
    ['orange', 19, 'Orange'],
    ['coral', 22, 'Coral'],
    ['purple', 26, 'Purple'],
  ],
  headphonesColor: [
    ['charcoal', 1, 'Charcoal'],
    ['white', 5, 'White'],
    ['pink', 9, 'Pink'],
    ['mint', 16, 'Mint'],
    ['red', 22, 'Red'],
    ['gold', 32, 'Gold'],
    ['blue', 42, 'Electric blue'],
  ],
  glassesStyle: [
    ['classic', 1, 'Classic'],
    ['round', 4, 'Round'],
    ['square', 14, 'Square'],
    ['tortoise', 38, 'Tortoiseshell'],
  ],
  earrings: [
    ['none', 1, 'None'],
    ['studs', 1, 'Studs'],
    ['hoops', 6, 'Hoops'],
    ['drops', 18, 'Pearl drops'],
  ],
  wall: [
    ['cream', 1, 'Cream'],
    ['sage', 1, 'Sage'],
    ['dusk', 1, 'Dusty blue'],
    ['blush', 2, 'Blush'],
    ['lavender', 6, 'Lavender'],
    ['butter', 9, 'Butter'],
    ['mint', 12, 'Mint'],
    ['terracotta', 16, 'Terracotta'],
    ['navy', 24, 'Midnight'],
    ['charcoal', 32, 'Charcoal'],
  ],
  pattern: [
    ['plain', 1, 'Plain'],
    ['dots', 1, 'Dots'],
    ['stripes', 3, 'Stripes'],
    ['plaid', 7, 'Plaid'],
    ['brick', 10, 'Brick'],
    ['panels', 14, 'Wood panels'],
    ['stars', 19, 'Stars'],
    ['botanical', 28, 'Botanical'],
  ],
  floor: [
    ['oak', 1, 'Oak'],
    ['birch', 4, 'Light wood'],
    ['walnut', 8, 'Walnut'],
    ['tiles', 13, 'Tiles'],
    ['carpet', 20, 'Carpet'],
    ['concrete', 32, 'Concrete'],
  ],
  curtain: [
    ['teal', 1, 'Teal'],
    ['mustard', 4, 'Mustard'],
    ['rose', 7, 'Rose'],
    ['navy', 11, 'Navy'],
    ['sage', 15, 'Sage'],
    ['plum', 19, 'Plum'],
    ['cream', 26, 'Linen'],
    ['charcoal', 35, 'Charcoal'],
  ],
  wood: [
    ['honey', 1, 'Honey'],
    ['walnut', 6, 'Walnut'],
    ['pale', 10, 'Pale oak'],
    ['cherry', 17, 'Cherry'],
    ['ebony', 28, 'Ebony'],
    ['white', 38, 'White painted'],
  ],
  light: [
    ['warm', 1, 'Warm'],
    ['soft', 2, 'Soft white'],
    ['cool', 8, 'Cool daylight'],
    ['pink', 13, 'Pink'],
    ['violet', 18, 'Violet'],
    ['green', 26, 'Green'],
    ['rgb', 46, 'Slow RGB'],
  ],
  fairy: [
    ['multi', 1, 'Multicolour'],
    ['warm', 15, 'Warm white'],
    ['pink', 20, 'Pink'],
    ['blue', 24, 'Ice blue'],
    ['green', 30, 'Green'],
    ['purple', 42, 'Purple'],
    ['rainbow', 50, 'Rainbow cycle'],
  ],
}

export const OPTION_UNLOCKS = Object.entries(CATALOG).flatMap(([field, list]) =>
  list.map(([value, level, name]) => ({ field, value, level, name })),
)

const BY_KEY = new Map(OPTION_UNLOCKS.map((o) => [o.field + ':' + o.value, o]))

/** Every option of a field, in display order: [{ field, value, level, name }]. */
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
