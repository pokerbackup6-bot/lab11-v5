
import { Scenario } from './types.ts';

export const SYSTEM_DEFAULT_SCENARIOS: Scenario[] = [
  {
    "id": "sc-1768876138467",
    "name": "RFI BTN - 40bb",
    "description": "Treino de abertura (Raise First In) do BTN com 40bb de stack.",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "RFI",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": [],
    "stackBB": 40,
    "heroBetSize": 2.2,
    "ranges": {
      "22": { "RAISE 2.2": 100 }, "33": { "RAISE 2.2": 100 }, "44": { "RAISE 2.2": 100 }, "55": { "RAISE 2.2": 100 }, "66": { "RAISE 2.2": 100 }, "77": { "RAISE 2.2": 100 }, "88": { "RAISE 2.2": 100 }, "99": { "RAISE 2.2": 100 }, "AA": { "RAISE 2.2": 100 }, "AKs": { "RAISE 2.2": 100 }, "AQs": { "RAISE 2.2": 100 }, "AJs": { "RAISE 2.2": 100 }, "ATs": { "RAISE 2.2": 100 }, "A8s": { "RAISE 2.2": 100 }, "A7s": { "RAISE 2.2": 100 }, "A6s": { "RAISE 2.2": 100 }, "A5s": { "RAISE 2.2": 100 }, "A4s": { "RAISE 2.2": 100 }, "A3s": { "RAISE 2.2": 100 }, "A2s": { "RAISE 2.2": 100 }, "A9s": { "RAISE 2.2": 100 }, "KK": { "RAISE 2.2": 100 }, "QQ": { "RAISE 2.2": 100 }, "JJ": { "RAISE 2.2": 100 }, "TT": { "RAISE 2.2": 100 }, "AKo": { "RAISE 2.2": 100 }, "AQo": { "RAISE 2.2": 100 }, "AJo": { "RAISE 2.2": 100 }, "ATo": { "RAISE 2.2": 100 }, "A9o": { "RAISE 2.2": 100 }, "A8o": { "RAISE 2.2": 100 }, "A4o": { "RAISE 2.2": 100 }, "A2o": { "RAISE 2.2": 100 }, "A3o": { "RAISE 2.2": 100 }, "A5o": { "RAISE 2.2": 100 }, "A6o": { "RAISE 2.2": 100 }, "A7o": { "RAISE 2.2": 100 }, "KQs": { "RAISE 2.2": 100 }, "KJs": { "RAISE 2.2": 100 }, "KTs": { "RAISE 2.2": 100 }, "K9s": { "RAISE 2.2": 100 }, "K8s": { "RAISE 2.2": 100 }, "K2s": { "RAISE 2.2": 100 }, "K3s": { "RAISE 2.2": 100 }, "K4s": { "RAISE 2.2": 100 }, "K5s": { "RAISE 2.2": 100 }, "K6s": { "RAISE 2.2": 100 }, "K7s": { "RAISE 2.2": 100 }, "QJs": { "RAISE 2.2": 100 }, "QTs": { "RAISE 2.2": 100 }, "Q9s": { "RAISE 2.2": 100 }, "Q8s": { "RAISE 2.2": 100 }, "Q7s": { "RAISE 2.2": 100 }, "Q6s": { "RAISE 2.2": 100 }, "Q5s": { "RAISE 2.2": 100 }, "Q4s": { "RAISE 2.2": 100 }, "Q3s": { "RAISE 2.2": 100 }, "Q2s": { "RAISE 2.2": 100 }, "J3s": { "RAISE 2.2": 100 }, "J4s": { "RAISE 2.2": 100 }, "J5s": { "RAISE 2.2": 100 }, "J6s": { "RAISE 2.2": 100 }, "J7s": { "RAISE 2.2": 100 }, "J8s": { "RAISE 2.2": 100 }, "J9s": { "RAISE 2.2": 100 }, "JTs": { "RAISE 2.2": 100 }, "T9s": { "RAISE 2.2": 100 }, "T8s": { "RAISE 2.2": 100 }, "98s": { "RAISE 2.2": 100 }, "97s": { "RAISE 2.2": 100 }, "87s": { "RAISE 2.2": 100 }, "T7s": { "RAISE 2.2": 100 }, "T6s": { "RAISE 2.2": 100 }, "96s": { "RAISE 2.2": 100 }, "86s": { "RAISE 2.2": 100 }, "76s": { "RAISE 2.2": 100 }, "65s": { "RAISE 2.2": 100 }, "75s": { "RAISE 2.2": 100 }, "85s": { "RAISE 2.2": 100 }, "95s": { "RAISE 2.2": 100 }, "T5s": { "RAISE 2.2": 100 }, "T4s": { "RAISE 2.2": 100 }, "64s": { "RAISE 2.2": 100 }, "54s": { "RAISE 2.2": 100 }, "K6o": { "RAISE 2.2": 100 }, "K7o": { "RAISE 2.2": 100 }, "K8o": { "RAISE 2.2": 100 }, "K9o": { "RAISE 2.2": 100 }, "KTo": { "RAISE 2.2": 100 }, "KJo": { "RAISE 2.2": 100 }, "KQo": { "RAISE 2.2": 100 }, "QJo": { "RAISE 2.2": 100 }, "QTo": { "RAISE 2.2": 100 }, "JTo": { "RAISE 2.2": 100 }, "Q9o": { "RAISE 2.2": 100 }, "J9o": { "RAISE 2.2": 100 }, "T9o": { "RAISE 2.2": 100 }, "Q8o": { "RAISE 2.2": 100 }, "J8o": { "RAISE 2.2": 100 }, "T8o": { "RAISE 2.2": 100 }, "98o": { "RAISE 2.2": 100 }, "Q7o": { "RAISE 2.2": 65, "Fold": 35 }, "87o": { "RAISE 2.2": 35, "Fold": 65 }, "J2s": { "RAISE 2.2": 30, "Fold": 70 }
    },
    "customActions": ["Fold", "RAISE 2.2"]
  },
  {
    "id": "sc-1768840929241",
    "name": "BTN vs EP - 30bb",
    "description": "Pratique enfrentando um open do UTG enquanto está no BTN.",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "3-bet",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": ["UTG"],
    "stackBB": 30,
    "heroBetSize": 6.3,
    "opponentBetSize": 2.2,
    "ranges": {
      "22": { "CALL": 100 }, "33": { "CALL": 100 }, "44": { "CALL": 100 }, "55": { "CALL": 100 }, "66": { "CALL": 100 }, "77": { "CALL": 100 },
      "88": { "RAISE 6.3": 20, "CALL": 80 }, "99": { "RAISE 6.3": 20, "CALL": 80 }, "87s": { "CALL": 100 }, "98s": { "CALL": 100 },
      "T9s": { "CALL": 100 }, "A6s": { "CALL": 100 }, "A5s": { "CALL": 100 }, "ATs": { "CALL": 100 }, "KJs": { "CALL": 100 },
      "KQs": { "CALL": 100 }, "K8s": { "CALL": 100 }, "A4s": { "CALL": 100 }, "A3s": { "CALL": 100 }, "A8s": { "RAISE 6.3": 20, "CALL": 80 },
      "A7s": { "RAISE 6.3": 20, "CALL": 80 }, "97s": { "CALL": 50, "Fold": 50 }, "K7s": { "CALL": 30, "Fold": 70 }, "K6s": { "CALL": 30, "Fold": 70 },
      "A2s": { "CALL": 15, "Fold": 85 }, "K9s": { "RAISE 6.3": 30, "CALL": 70 }, "Q9s": { "RAISE 6.3": 30, "CALL": 70 }, "A9s": { "RAISE 6.3": 10, "CALL": 90 },
      "ATo": { "RAISE 6.3": 50, "CALL": 50 }, "KTo": { "RAISE 6.3": 10, "Fold": 90 }, "QJo": { "RAISE 6.3": 10, "CALL": 25, "Fold": 70 },
      "KTs": { "RAISE 6.3": 10, "CALL": 90 }, "J9s": { "RAISE 6.3": 10, "CALL": 90 }, "KQo": { "RAISE 6.3": 10, "CALL": 90 },
      "AQs": { "RAISE 6.3": 10, "CALL": 90 }, "KJo": { "RAISE 6.3": 30, "CALL": 70 }, "AJs": { "RAISE 6.3": 25, "CALL": 75 },
      "AQo": { "RAISE 6.3": 25, "CALL": 75 }, "AKo": { "ALL-IN": 50, "RAISE 6.3": 50 }, "AKs": { "RAISE 6.3": 100 }, "QJs": { "ALL-IN": 100 },
      "QTs": { "CALL": 100 }, "JTs": { "CALL": 100 }, "TT": { "ALL-IN": 40, "RAISE 6.3": 20, "CALL": 40 }, "JJ": { "ALL-IN": 15, "RAISE 6.3": 45, "CALL": 40 },
      "QQ": { "RAISE 6.3": 75, "CALL": 25 }, "KK": { "RAISE 6.3": 80, "CALL": 20 }, "AA": { "RAISE 6.3": 70, "CALL": 30 }
    },
    "customActions": ["Fold", "ALL-IN", "CALL", "RAISE 6.3"]
  },
  {
    "id": "sc-1768875174875",
    "name": "SB vs BTN - 30bb",
    "description": "Um treino para praticar o jogo no SB enfrentando um steal do BTN.",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "3-bet",
    "playerCount": 9,
    "heroPos": "SB",
    "opponents": ["BTN"],
    "stackBB": 30,
    "heroBetSize": 8,
    "opponentBetSize": 2.1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 35, "RAISE 8.0": 65 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 60, "RAISE 8.0": 40 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 80, "RAISE 8.0": 20 }, "AQo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "JTs": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 50, "RAISE 8.0": 50 }, "AA": { "RAISE 8.0": 70, "CALL": 30 }, "KK": { "RAISE 8.0": 85, "CALL": 15 }, "QQ": { "RAISE 8.0": 100 }, "JJ": { "RAISE 8.0": 100 }, "TT": { "ALL-IN": 50, "RAISE 8.0": 50 }, "AKs": { "RAISE 8.0": 100 }, "AQs": { "RAISE 8.0": 100 }, "KQs": { "RAISE 8.0": 100 }, "K9s": { "CALL": 100 }, "K8s": { "CALL": 100 }, "K7s": { "CALL": 100 }, "Q9s": { "CALL": 100 }, "Q8s": { "CALL": 100 }, "J8s": { "CALL": 100 }, "T8s": { "CALL": 100 }, "98s": { "CALL": 100 }, "87s": { "CALL": 100 }, "K6s": { "CALL": 100 }, "K5s": { "CALL": 100 }, "A3s": { "CALL": 100 }, "A2s": { "CALL": 100 }, "A9s": { "CALL": 100 }, "A8s": { "CALL": 100 }, "ATs": { "RAISE 8.0": 70, "CALL": 30 }, "A4s": { "ALL-IN": 60, "CALL": 40 }, "Q7s": { "CALL": 50, "Fold": 50 }, "76s": { "CALL": 20, "Fold": 80 }, "A8o": { "RAISE 8.0": 55, "CALL": 45 }, "A7o": { "RAISE 8.0": 55, "CALL": 45 }, "A5o": { "RAISE 8.0": 70, "CALL": 30 }, "A9o": { "ALL-IN": 70, "RAISE 8.0": 20, "CALL": 10 }, "KTo": { "RAISE 8.0": 25, "CALL": 80 }, "QTo": { "RAISE 8.0": 25, "CALL": 80 }, "KJs": { "RAISE 8.0": 25, "CALL": 75 }, "AJs": { "ALL-IN": 20, "RAISE 8.0": 80 }, "J9s": { "ALL-IN": 30, "CALL": 70 }, "T9s": { "ALL-IN": 50, "CALL": 50 }, "QJo": { "RAISE 8.0": 40, "CALL": 60 }, "JTo": { "ALL-IN": 25, "RAISE 8.0": 15, "CALL": 60 }, "K4s": { "RAISE 8.0": 15, "CALL": 15, "Fold": 70 }, "A4o": { "RAISE 8.0": 10, "Fold": 90 }, "A6o": { "RAISE 8.0": 40, "CALL": 15, "Fold": 45 }, "K9o": { "RAISE 8.0": 20, "Fold": 80 }, "97s": { "CALL": 15, "Fold": 85 }, "T7s": { "CALL": 15, "Fold": 85 }, "Q6s": { "CALL": 15, "Fold": 85 }, "54s": { "CALL": 15, "Fold": 85 } },
    "customActions": ["Fold", "ALL-IN", "CALL", "RAISE 8.0"]
  },
  {
    "id": "sc-1768868945153",
    "name": "BB vs BTN - 30BB",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "3-bet",
    "playerCount": 9,
    "heroPos": "BB",
    "opponents": ["BTN"],
    "stackBB": 50,
    "heroBetSize": 2.5,
    "opponentBetSize": 2.1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AA": { "RAISE 8.0": 100 }, "AKs": { "RAISE 8.0": 100 }, "AQs": { "RAISE 8.0": 100 }, "AJs": { "RAISE 8.0": 100 }, "ATs": { "RAISE 8.0": 100 }, "KK": { "RAISE 8.0": 100 }, "QQ": { "RAISE 8.0": 100 }, "A9s": { "CALL": 100 }, "A8s": { "CALL": 100 }, "A7s": { "CALL": 100 }, "A6s": { "CALL": 100 }, "A4s": { "CALL": 100 }, "K3s": { "CALL": 100 }, "K2s": { "CALL": 100 }, "A2s": { "CALL": 100 }, "A3s": { "CALL": 100 }, "A5s": { "CALL": 100 }, "K4s": { "CALL": 100 }, "K5s": { "CALL": 100 }, "K8s": { "CALL": 100 }, "K9s": { "CALL": 100 }, "KTs": { "CALL": 100 }, "KJs": { "CALL": 100 }, "QJs": { "CALL": 100 }, "QTs": { "CALL": 100 }, "Q9s": { "CALL": 100 }, "Q8s": { "CALL": 100 }, "Q7s": { "CALL": 100 }, "Q6s": { "CALL": 100 }, "Q5s": { "CALL": 100 }, "Q4s": { "CALL": 100 }, "Q3s": { "CALL": 100 }, "Q2s": { "CALL": 100 }, "JTs": { "CALL": 100 }, "J9s": { "CALL": 100 }, "J8s": { "CALL": 100 }, "J7s": { "CALL": 100 }, "J6s": { "CALL": 100 }, "J5s": { "CALL": 100 }, "J4s": { "CALL": 100 }, "J3s": { "CALL": 100 }, "J2s": { "CALL": 100 }, "32s": { "CALL": 100 }, "42s": { "CALL": 100 }, "52s": { "CALL": 100 }, "62s": { "CALL": 100 }, "72s": { "CALL": 100 }, "82s": { "CALL": 100 }, "92s": { "CALL": 100 }, "T2s": { "CALL": 100 }, "T3s": { "CALL": 100 }, "T4s": { "CALL": 100 }, "T5s": { "CALL": 100 }, "T6s": { "CALL": 100 }, "T7s": { "CALL": 100 }, "T8s": { "CALL": 100 }, "T9s": { "CALL": 100 }, "98s": { "CALL": 100 }, "97s": { "CALL": 100 }, "96s": { "CALL": 100 }, "95s": { "CALL": 100 }, "94s": { "CALL": 100 }, "93s": { "CALL": 100 }, "83s": { "CALL": 100 }, "84s": { "CALL": 100 }, "85s": { "CALL": 100 }, "86s": { "CALL": 100 }, "87s": { "CALL": 100 }, "76s": { "CALL": 100 }, "75s": { "CALL": 100 }, "74s": { "CALL": 100 }, "73s": { "CALL": 100 }, "63s": { "CALL": 100 }, "64s": { "CALL": 100 }, "65s": { "CALL": 100 }, "54s": { "CALL": 100 }, "53s": { "CALL": 100 }, "43s": { "CALL": 100 }, "AQo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "TT": { "ALL-IN": 100 }, "JJ": { "ALL-IN": 60, "RAISE 8.0": 40 }, "KQs": { "RAISE 8.0": 60, "CALL": 40 }, "AKo": { "ALL-IN": 50, "RAISE 8.0": 50 }, "KQo": { "ALL-IN": 50, "CALL": 50 }, "43o": { "CALL": 100 }, "54o": { "CALL": 100 }, "65o": { "CALL": 100 }, "76o": { "CALL": 100 }, "87o": { "CALL": 100 }, "98o": { "CALL": 100 }, "T9o": { "CALL": 100 }, "JTo": { "CALL": 100 }, "QJo": { "CALL": 100 }, "KJo": { "CALL": 100 }, "KTo": { "CALL": 100 }, "QTo": { "CALL": 100 }, "J9o": { "CALL": 100 }, "T8o": { "CALL": 100 }, "97o": { "CALL": 100 }, "86o": { "CALL": 100 }, "85o": { "CALL": 100 }, "75o": { "CALL": 100 }, "64o": { "CALL": 100 }, "74o": { "CALL": 90, "Fold": 10 }, "53o": { "CALL": 100 }, "K9o": { "CALL": 100 }, "K8o": { "CALL": 100 }, "Q9o": { "CALL": 100 }, "K6o": { "CALL": 100 }, "K2o": { "CALL": 100 }, "K3o": { "CALL": 100 }, "T5o": { "CALL": 100 }, "A9o": { "ALL-IN": 60, "CALL": 40 }, "A8o": { "RAISE 8.0": 10, "CALL": 90 }, "A7o": { "RAISE 8.0": 40, "CALL": 60 }, "A6o": { "RAISE 8.0": 15, "CALL": 85 }, "A5o": { "ALL-IN": 60, "CALL": 40 }, "A4o": { "ALL-IN": 70, "RAISE 8.0": 10, "CALL": 20 }, "A3o": { "ALL-IN": 30, "CALL": 70 }, "A2o": { "ALL-IN": 60, "RAISE 8.0": 20, "CALL": 20 }, "K7o": { "ALL-IN": 45, "CALL": 55 }, "K5o": { "RAISE 8.0": 25, "CALL": 75 }, "K4o": { "RAISE 8.0": 15, "CALL": 90 }, "Q7o": { "CALL": 100 }, "Q8o": { "CALL": 100 }, "J8o": { "CALL": 100 }, "Q5o": { "CALL": 100 }, "Q6o": { "RAISE 8.0": 25, "CALL": 75 }, "J7o": { "RAISE 8.0": 15, "CALL": 85 }, "T7o": { "RAISE 8.0": 15, "CALL": 85 }, "T6o": { "RAISE 8.0": 15, "CALL": 85 }, "96o": { "CALL": 100 }, "J6o": { "CALL": 100 }, "Q4o": { "RAISE 8.0": 20, "CALL": 80 }, "Q3o": { "RAISE 8.0": 20, "CALL": 80 }, "Q2o": { "RAISE 8.0": 20, "CALL": 80 }, "J5o": { "CALL": 100 }, "J3o": { "CALL": 100 }, "J4o": { "RAISE 8.0": 10, "CALL": 90 }, "J2o": { "CALL": 20, "Fold": 80 }, "32o": { "Fold": 100 }, "42o": { "Fold": 100 }, "52o": { "Fold": 100 }, "62o": { "Fold": 100 }, "72o": { "Fold": 100 }, "82o": { "Fold": 100 }, "T2o": { "Fold": 100 }, "92o": { "Fold": 100 }, "94o": { "Fold": 100 }, "93o": { "Fold": 100 }, "84o": { "Fold": 100 }, "83o": { "Fold": 100 }, "73o": { "Fold": 100 }, "63o": { "Fold": 100 }, "T3o": { "Fold": 100 }, "T4o": { "CALL": 50, "Fold": 50 }, "95o": { "CALL": 25, "Fold": 75 }
    },
    "customActions": ["Fold", "ALL-IN", "CALL", "RAISE 8.0"]
  },
  {
    "id": "sc-1768870445681",
    "name": "BB vs SB LIMP - 30bb",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "iso",
    "playerCount": 9,
    "heroPos": "BB",
    "opponents": ["SB"],
    "stackBB": 30,
    "heroBetSize": 2.5,
    "opponentBetSize": 1,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 30, "RAISE 3.5": 70 }, "66": { "RAISE 3.5": 100 }, "77": { "RAISE 3.5": 100 }, "88": { "RAISE 3.5": 100 }, "99": { "RAISE 3.5": 100 }, "AA": { "RAISE 3.5": 100 }, "AKs": { "RAISE 3.5": 100 }, "AQs": { "RAISE 3.5": 100 }, "AJs": { "RAISE 3.5": 100 }, "ATs": { "RAISE 3.5": 100 }, "A9s": { "RAISE 3.5": 100 }, "A8s": { "RAISE 3.5": 100 }, "AKo": { "RAISE 3.5": 100 }, "KK": { "RAISE 3.5": 100 }, "KQs": { "RAISE 3.5": 100 }, "KJs": { "RAISE 3.5": 100 }, "KTs": { "RAISE 3.5": 100 }, "JTs": { "RAISE 3.5": 100 }, "QJs": { "RAISE 3.5": 100 }, "QQ": { "RAISE 3.5": 100 }, "JJ": { "RAISE 3.5": 100 }, "TT": { "RAISE 3.5": 100 }, "AQo": { "RAISE 3.5": 100 }, "AJo": { "RAISE 3.5": 100 }, "ATo": { "RAISE 3.5": 100 }, "72s": { "RAISE 3.5": 100 }, "62s": { "RAISE 3.5": 100 }, "A6s": { "CHECK": 100 }, "A5s": { "CHECK": 100 }, "A4s": { "CHECK": 100 }, "A3s": { "CHECK": 100 }, "A2s": { "CHECK": 100 }, "K9s": { "CHECK": 100 }, "K8s": { "CHECK": 100 }, "K7s": { "CHECK": 100 }, "K6s": { "CHECK": 100 }, "K5s": { "CHECK": 100 }, "K4s": { "CHECK": 100 }, "K3s": { "CHECK": 100 }, "K2s": { "CHECK": 100 }, "82s": { "CHECK": 100 }, "92s": { "CHECK": 100 }, "T2s": { "CHECK": 100 }, "J2s": { "CHECK": 100 }, "Q2s": { "CHECK": 100 }, "43s": { "CHECK": 100 }, "42s": { "CHECK": 100 }, "32s": { "CHECK": 100 }, "53s": { "CHECK": 100 }, "54s": { "CHECK": 100 }, "73s": { "CHECK": 100 }, "74s": { "CHECK": 100 }, "75s": { "CHECK": 100 }, "76s": { "CHECK": 100 }, "87s": { "CHECK": 100 }, "98s": { "CHECK": 100 }, "T9s": { "CHECK": 100 }, "QTs": { "CHECK": 100 }, "Q9s": { "CHECK": 100 }, "Q8s": { "CHECK": 100 }, "Q7s": { "CHECK": 100 }, "Q6s": { "CHECK": 100 }, "Q5s": { "CHECK": 100 }, "Q4s": { "CHECK": 100 }, "Q3s": { "CHECK": 100 }, "J3s": { "CHECK": 100 }, "T3s": { "CHECK": 100 }, "93s": { "CHECK": 100 }, "83s": { "CHECK": 100 }, "J9s": { "CHECK": 100 }, "J8s": { "CHECK": 100 }, "J7s": { "CHECK": 100 }, "J6s": { "CHECK": 100 }, "J5s": { "CHECK": 100 }, "J4s": { "CHECK": 100 }, "T8s": { "CHECK": 100 }, "T7s": { "CHECK": 100 }, "T6s": { "CHECK": 100 }, "T5s": { "CHECK": 100 }, "T4s": { "CHECK": 100 }, "97s": { "CHECK": 100 }, "96s": { "CHECK": 100 }, "95s": { "CHECK": 100 }, "94s": { "CHECK": 100 }, "86s": { "CHECK": 100 }, "85s": { "CHECK": 100 }, "84s": { "CHECK": 100 }, "JTo": { "CHECK": 100 }, "98o": { "CHECK": 100 }, "87o": { "CHECK": 100 }, "KQo": { "ALL-IN": 15, "RAISE 3.5": 45, "CHECK": 40 }, "KJo": { "RAISE 3.5": 40, "CHECK": 60 }, "QJo": { "RAISE 3.5": 15, "CHECK": 85 }, "KTo": { "RAISE 3.5": 25, "CHECK": 75 }, "QTo": { "RAISE 3.5": 25, "CHECK": 75 }, "J9o": { "RAISE 3.5": 25, "CHECK": 80 }, "J8o": { "RAISE 3.5": 25, "CHECK": 80 }, "T9o": { "RAISE 3.5": 15, "CHECK": 85 }, "T8o": { "RAISE 3.5": 15, "CHECK": 85 }, "97o": { "RAISE 3.5": 15, "CHECK": 85 }, "A9o": { "ALL-IN": 55, "RAISE 3.5": 45 }, "A8o": { "ALL-IN": 15, "RAISE 3.5": 75, "CHECK": 10 }, "A7o": { "ALL-IN": 10, "RAISE 3.5": 75, "CHECK": 15 }, "A5o": { "CHECK": 100 }, "K5o": { "CHECK": 100 }, "K6o": { "CHECK": 100 }, "53o": { "CHECK": 100 }, "A6o": { "RAISE 3.5": 40, "CHECK": 60 }, "A4o": { "ALL-IN": 5, "RAISE 3.5": 15, "CHECK": 80 }, "A3o": { "RAISE 3.5": 20, "CHECK": 80 }, "A2o": { "RAISE 3.5": 20, "CHECK": 80 }, "K3o": { "RAISE 3.5": 35, "CHECK": 65 }, "K2o": { "RAISE 3.5": 35, "CHECK": 65 }, "Q3o": { "RAISE 3.5": 35, "CHECK": 65 }, "K4o": { "ALL-IN": 5, "RAISE 3.5": 15, "CHECK": 80 }, "K7o": { "RAISE 3.5": 50, "CHECK": 50 }, "K8o": { "RAISE 3.5": 70, "CHECK": 30 }, "K9o": { "RAISE 3.5": 70, "CHECK": 30 }, "Q9o": { "RAISE 3.5": 45, "CHECK": 55 }, "Q8o": { "RAISE 3.5": 45, "CHECK": 55 }, "Q7o": { "RAISE 3.5": 45, "CHECK": 55 }, "J7o": { "RAISE 3.5": 50, "CHECK": 50 }, "T7o": { "RAISE 3.5": 50, "CHECK": 50 }, "Q6o": { "RAISE 3.5": 15, "CHECK": 85 }, "Q5o": { "RAISE 3.5": 15, "CHECK": 85 }, "Q4o": { "RAISE 3.5": 60, "CHECK": 40 }, "Q2o": { "RAISE 3.5": 70, "CHECK": 30 }, "J2o": { "RAISE 3.5": 70, "CHECK": 30 }, "J3o": { "RAISE 3.5": 70, "CHECK": 30 }, "J4o": { "RAISE 3.5": 70, "CHECK": 30 }, "T3o": { "RAISE 3.5": 70, "CHECK": 30 }, "T2o": { "RAISE 3.5": 70, "CHECK": 30 }, "85o": { "RAISE 3.5": 70, "CHECK": 30 }, "73o": { "RAISE 3.5": 70, "CHECK": 30 }, "84o": { "RAISE 3.5": 70, "CHECK": 30 }, "94o": { "RAISE 3.5": 70, "CHECK": 30 }, "J6o": { "RAISE 3.5": 25, "CHECK": 75 }, "64o": { "RAISE 3.5": 25, "CHECK": 75 }, "62o": { "RAISE 3.5": 25, "CHECK": 75 }, "72o": { "RAISE 3.5": 25, "CHECK": 75 }, "T6o": { "RAISE 3.5": 60, "CHECK": 40 }, "96o": { "RAISE 3.5": 60, "CHECK": 40 }, "A7s": { "RAISE 3.5": 50, "CHECK": 50 }, "J5o": { "RAISE 3.5": 50, "CHECK": 50 }, "T5o": { "RAISE 3.5": 50, "CHECK": 50 }, "92o": { "RAISE 3.5": 50, "CHECK": 50 }, "82o": { "RAISE 3.5": 50, "CHECK": 50 }, "93o": { "RAISE 3.5": 50, "CHECK": 50 }, "83o": { "RAISE 3.5": 50, "CHECK": 50 }, "63o": { "RAISE 3.5": 50, "CHECK": 50 }, "T4o": { "RAISE 3.5": 90, "CHECK": 10 }, "95o": { "RAISE 3.5": 80, "CHECK": 20 }, "86o": { "RAISE 3.5": 40, "CHECK": 60 }, "74o": { "RAISE 3.5": 40, "CHECK": 60 }, "75o": { "RAISE 3.5": 40, "CHECK": 60 }, "65o": { "RAISE 3.5": 40, "CHECK": 60 }, "76o": { "RAISE 3.5": 15, "CHECK": 85 }, "54o": { "RAISE 3.5": 15, "CHECK": 85 }, "52o": { "RAISE 3.5": 10, "CHECK": 90 }, "42o": { "RAISE 3.5": 10, "CHECK": 90 }, "43o": { "RAISE 3.5": 15, "CHECK": 85 }, "32o": { "RAISE 3.5": 50, "CHECK": 50 }, "65s": { "RAISE 3.5": 30, "CHECK": 70 }, "63s": { "RAISE 3.5": 30, "CHECK": 70 }, "64s": { "RAISE 3.5": 50, "CHECK": 50 }, "52s": { "RAISE 3.5": 50, "CHECK": 50 } },
    "customActions": ["Fold", "RAISE 3.5", "ALL-IN", "CHECK"]
  },
  {
    "id": "sc-1768871379341",
    "name": "OPEN SHOVE - 10bb",
    "modality": "MTT",
    "street": "PREFLOP",
    "preflopAction": "open shove",
    "playerCount": 9,
    "heroPos": "BTN",
    "opponents": [],
    "stackBB": 10,
    "heroBetSize": 2.5,
    "ranges": {
      "22": { "ALL-IN": 100 }, "33": { "ALL-IN": 100 }, "44": { "ALL-IN": 100 }, "55": { "ALL-IN": 100 }, "66": { "ALL-IN": 100 }, "77": { "ALL-IN": 100 }, "88": { "ALL-IN": 100 }, "99": { "ALL-IN": 100 }, "AQs": { "ALL-IN": 100 }, "AJs": { "ALL-IN": 100 }, "ATs": { "ALL-IN": 100 }, "A9s": { "ALL-IN": 100 }, "A8s": { "ALL-IN": 100 }, "A7s": { "ALL-IN": 100 }, "A6s": { "ALL-IN": 100 }, "A5s": { "ALL-IN": 100 }, "KQs": { "ALL-IN": 100 }, "KJs": { "ALL-IN": 100 }, "KTs": { "ALL-IN": 100 }, "K9s": { "ALL-IN": 100 }, "K8s": { "ALL-IN": 100 }, "K7s": { "ALL-IN": 100 }, "K6s": { "ALL-IN": 100 }, "K5s": { "ALL-IN": 100 }, "K4s": { "ALL-IN": 100 }, "K3s": { "ALL-IN": 100 }, "QJs": { "ALL-IN": 100 }, "QTs": { "ALL-IN": 100 }, "Q9s": { "ALL-IN": 100 }, "Q8s": { "ALL-IN": 100 }, "J9s": { "ALL-IN": 100 }, "J8s": { "ALL-IN": 100 }, "T8s": { "ALL-IN": 100 }, "98s": { "ALL-IN": 100 }, "97s": { "ALL-IN": 100 }, "87s": { "ALL-IN": 100 }, "JTo": { "ALL-IN": 100 }, "QTo": { "ALL-IN": 100 }, "KTo": { "ALL-IN": 100 }, "ATo": { "ALL-IN": 100 }, "AJo": { "ALL-IN": 100 }, "AQo": { "ALL-IN": 100 }, "AKo": { "ALL-IN": 100 }, "KQo": { "ALL-IN": 100 }, "KJo": { "ALL-IN": 100 }, "QJo": { "ALL-IN": 100 }, "A9o": { "ALL-IN": 100 }, "A8o": { "ALL-IN": 100 }, "A7o": { "ALL-IN": 100 }, "A6o": { "ALL-IN": 100 }, "A5o": { "ALL-IN": 100 }, "A4o": { "ALL-IN": 100 }, "A3o": { "ALL-IN": 100 }, "A2o": { "ALL-IN": 100 }, "K9o": { "ALL-IN": 100 }, "K8o": { "CALL": 100 }, "AA": { "CALL": 100 }, "KK": { "CALL": 100 }, "QQ": { "CALL": 100 }, "JJ": { "CALL": 100 }, "Q5s": { "CALL": 100 }, "Q4s": { "CALL": 100 }, "J6s": { "CALL": 100 }, "T6s": { "CALL": 100 }, "K2s": { "CALL": 100 }, "A4s": { "ALL-IN": 70, "CALL": 30 }, "A3s": { "ALL-IN": 70, "CALL": 30 }, "JTs": { "ALL-IN": 70, "CALL": 30 }, "T9s": { "ALL-IN": 100 }, "Q7s": { "ALL-IN": 70, "CALL": 30 }, "T7s": { "ALL-IN": 70, "CALL": 30 }, "Q6s": { "ALL-IN": 80, "CALL": 20 }, "J7s": { "ALL-IN": 10, "CALL": 90 }, "TT": { "ALL-IN": 50, "CALL": 50 }, "K7o": { "CALL": 25, "Fold": 75 }, "76s": { "ALL-IN": 60, "CALL": 40 }, "A2s": { "ALL-IN": 100 }, "AKs": { "ALL-IN": 40, "CALL": 60 }, "T9o": { "ALL-IN": 60, "CALL": 40 }, "Q9o": { "ALL-IN": 35, "CALL": 65 }, "J9o": { "ALL-IN": 20, "CALL": 80 }, "Q3s": { "CALL": 75, "Fold": 25 }, "J5s": { "CALL": 40, "Fold": 60 }, "86s": { "CALL": 75, "Fold": 25 }
    },
    "customActions": ["Fold", "ALL-IN", "CALL"]
  },
];
