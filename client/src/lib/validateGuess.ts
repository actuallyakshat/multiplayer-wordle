// import api from "./axios";

// export async function validateGuess(guess: string): Promise<boolean> {
//   if (guess.length != 5) return false;

//   try {
//     const response = await api.get(
//       `https://api.dictionaryapi.dev/api/v2/entries/en/${guess}`,
//     );
//     if (response.status == 200) return true;
//     else return false;
//   } catch (error) {
//     console.error("Error validating guess", error);
//     return false;
//   }
// }

import englishWords from "an-array-of-english-words";

const wordSet = new Set(englishWords);

export function validateGuess(guess: string): boolean {
  if (guess.length !== 5) return false;
  return wordSet.has(guess.toLowerCase());
}
