export default function createNumberTranslator(
    isTimeBased: boolean,
    originalStart?: bigint
): (theNumber: bigint) => string {
    return function (theNumber: bigint): string {
        if (isTimeBased && originalStart) {
            theNumber += originalStart;
        }
        const zeroPad = (num: bigint) => String(num).padStart(3, '0');
        const seconds = theNumber / BigInt(1000000000);
        const millis = zeroPad((theNumber / BigInt(1000000)) % BigInt(1000));
        const micros = zeroPad((theNumber / BigInt(1000)) % BigInt(1000));
        const nanos = zeroPad(theNumber % BigInt(1000));
        return seconds + '.' + millis + ' ' + micros + ' ' + nanos;
    };
}
