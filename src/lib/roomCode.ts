import { customAlphabet } from "nanoid";

// No 0/O, 1/I/L, to keep codes easy to read aloud and type on mobile.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const generateRoomCode = customAlphabet(ALPHABET, 4);
