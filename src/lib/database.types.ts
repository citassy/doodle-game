export type RoomStatus =
  | "lobby"
  | "prep"
  | "countdown"
  | "drawing"
  | "transition"
  | "guessing"
  | "round_results"
  | "finished";

export type WordGiverMode = "computer" | "player";

export interface Room {
  id: string;
  code: string;
  host_player_id: string | null;
  status: RoomStatus;
  word_giver_mode: WordGiverMode;
  word_giver_player_id: string | null;
  current_round: number;
  phase_deadline: string | null;
  revealed_numbers: number[];
  max_players: number;
  created_at: string;
  last_activity_at: string;
}

export interface Player {
  id: string;
  client_id: string;
  room_id: string;
  name: string;
  color: string;
  is_host: boolean;
  is_word_giver: boolean;
  score: number;
  connected: boolean;
  joined_at: string;
  part1_done: boolean;
}

export interface Word {
  id: string;
  text: string;
  category: string;
  difficulty: 1 | 2 | 3;
  tags: string[];
}

export interface RoomWord {
  id: string;
  room_id: string;
  round_number: number;
  word_text: string;
}

export interface StrokePoint {
  x: number;
  y: number;
  t: number;
}

export interface Drawing {
  id: string;
  room_id: string;
  player_id: string;
  round_number: number;
  strokes: StrokePoint[][];
  updated_at: string;
}

export interface Guess {
  id: string;
  room_id: string;
  player_id: string;
  round_number: number;
  guess_text: string;
  is_correct: boolean;
  submitted_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      rooms: { Row: Room; Insert: Partial<Room>; Update: Partial<Room> };
      players: { Row: Player; Insert: Partial<Player>; Update: Partial<Player> };
      words: { Row: Word; Insert: Partial<Word>; Update: Partial<Word> };
      room_words: { Row: RoomWord; Insert: Partial<RoomWord>; Update: Partial<RoomWord> };
      drawings: { Row: Drawing; Insert: Partial<Drawing>; Update: Partial<Drawing> };
      guesses: { Row: Guess; Insert: Partial<Guess>; Update: Partial<Guess> };
    };
  };
}
