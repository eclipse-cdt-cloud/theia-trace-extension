/**
 * Transforms a string value to a numerical value, either parsing the string as
 * a number or by running some kind of hash function on the string. This
 * function for a same string will always return the same result.
 *
 * @param str the string value to hash
 */
const hash = (str: string): number => {
    const int = parseInt(str);
    if (!isNaN(int)) {
        return int;
    }
    // Based on https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
    let hashCode = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hashCode = ((hashCode << 5) - hashCode) + chr;
        hashCode |= 0; // Convert to 32bit integer
    }
    return hashCode;
};

export default hash;
