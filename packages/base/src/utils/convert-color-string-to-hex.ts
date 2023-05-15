/**
 * Converts a string representing a color into a number.  Works with both RGB strings and hex number strings.  Ignores alpha values.
 * @param {string} rgb RGB or hex string for a color.
 * @returns {number} Hex number of the input string.  Ignores alpha value if present.
 */
export function convertColorStringToHexNumber(rgb: string): number {
    let string = '0';
    rgb.trim();
    if (rgb[0] === '#') {
        // We are working with hex string.
        string = '0x' + rgb.slice(1);
    } else if (rgb[0] === 'r') {
        // Working with RGB String
        const match = rgb.match(/\d+/g);
        if (match) {
            string =
                '0x' +
                match
                    .map(x => {
                        x = parseInt(x).toString(16);
                        return x.length === 1 ? '0' + x : x;
                    })
                    .join('');
            string = string.slice(0, 8);
        }
    }
    return Number(string);
}
