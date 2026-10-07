// Hintergründe für Start, Lounge und Spiel. brightness gleicht unterschiedlich helle Bilder aus.
export const ROOMS = [
  { id: 'kaminzimmer', name: 'Kaminzimmer', brightness: 0.7 },
  { id: 'wohnzimmer', name: 'Wohnzimmer', brightness: 0.6 },
  { id: 'kneipe', name: 'Kneipe', brightness: 0.7 },
  { id: 'partykeller', name: 'Partykeller', brightness: 1.1 },
  { id: 'wintergarten', name: 'Wintergarten', brightness: 0.65 },
];
const STORAGE_KEY = 'obo-room';

let room = loadRoom();

export function roomImage(choice) {
  return `assets/images/rooms/${choice.id}.webp`;
}

export function currentRoom() {
  return room;
}

export function setRoom(choice) {
  room = choice;
  try {
    localStorage.setItem(STORAGE_KEY, room.id);
  } catch {
    // ohne localStorage gilt der Raum nur bis zum Neuladen
  }
  showRoom();
}

export function showRoom() {
  const style = document.documentElement.style;
  style.setProperty('--room-image', `url('${roomImage(room)}')`);
  style.setProperty('--room-brightness', room.brightness);
}

function loadRoom() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return ROOMS.find((choice) => choice.id === id) ?? ROOMS[0];
  } catch {
    return ROOMS[0];
  }
}
