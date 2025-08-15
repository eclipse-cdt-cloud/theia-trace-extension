import { TextEncoder } from 'util';
/*
 * Add TextEncoder from NodeJS util as it is
 * no longer available for Jest tests after React 18.
 */
global.TextEncoder = TextEncoder;
