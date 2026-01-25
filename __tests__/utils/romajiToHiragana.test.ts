import {
  romajiToHiragana,
  processRomajiInput,
  isAllHiragana,
  isValidReadingInput,
  type RomajiInputState,
} from '../../src/utils/romajiToHiragana';

describe('romajiToHiragana', () => {
  describe('basic vowels', () => {
    it('converts a to あ', () => {
      expect(romajiToHiragana('a')).toBe('あ');
    });

    it('converts i to い', () => {
      expect(romajiToHiragana('i')).toBe('い');
    });

    it('converts u to う', () => {
      expect(romajiToHiragana('u')).toBe('う');
    });

    it('converts e to え', () => {
      expect(romajiToHiragana('e')).toBe('え');
    });

    it('converts o to お', () => {
      expect(romajiToHiragana('o')).toBe('お');
    });
  });

  describe('k-row (ka, ki, ku, ke, ko)', () => {
    it('converts ka to か', () => {
      expect(romajiToHiragana('ka')).toBe('か');
    });

    it('converts ki to き', () => {
      expect(romajiToHiragana('ki')).toBe('き');
    });

    it('converts ku to く', () => {
      expect(romajiToHiragana('ku')).toBe('く');
    });

    it('converts ke to け', () => {
      expect(romajiToHiragana('ke')).toBe('け');
    });

    it('converts ko to こ', () => {
      expect(romajiToHiragana('ko')).toBe('こ');
    });
  });

  describe('s-row with wapuro variants', () => {
    it('converts sa to さ', () => {
      expect(romajiToHiragana('sa')).toBe('さ');
    });

    it('converts shi to し', () => {
      expect(romajiToHiragana('shi')).toBe('し');
    });

    it('converts si to し (wapuro variant)', () => {
      expect(romajiToHiragana('si')).toBe('し');
    });

    it('converts su to す', () => {
      expect(romajiToHiragana('su')).toBe('す');
    });

    it('converts se to せ', () => {
      expect(romajiToHiragana('se')).toBe('せ');
    });

    it('converts so to そ', () => {
      expect(romajiToHiragana('so')).toBe('そ');
    });
  });

  describe('t-row with wapuro variants', () => {
    it('converts ta to た', () => {
      expect(romajiToHiragana('ta')).toBe('た');
    });

    it('converts chi to ち', () => {
      expect(romajiToHiragana('chi')).toBe('ち');
    });

    it('converts ti to ち (wapuro variant)', () => {
      expect(romajiToHiragana('ti')).toBe('ち');
    });

    it('converts tsu to つ', () => {
      expect(romajiToHiragana('tsu')).toBe('つ');
    });

    it('converts tu to つ (wapuro variant)', () => {
      expect(romajiToHiragana('tu')).toBe('つ');
    });

    it('converts te to て', () => {
      expect(romajiToHiragana('te')).toBe('て');
    });

    it('converts to to と', () => {
      expect(romajiToHiragana('to')).toBe('と');
    });
  });

  describe('n-row', () => {
    it('converts na to な', () => {
      expect(romajiToHiragana('na')).toBe('な');
    });

    it('converts ni to に', () => {
      expect(romajiToHiragana('ni')).toBe('に');
    });

    it('converts nu to ぬ', () => {
      expect(romajiToHiragana('nu')).toBe('ぬ');
    });

    it('converts ne to ね', () => {
      expect(romajiToHiragana('ne')).toBe('ね');
    });

    it('converts no to の', () => {
      expect(romajiToHiragana('no')).toBe('の');
    });
  });

  describe('h-row with wapuro variants', () => {
    it('converts ha to は', () => {
      expect(romajiToHiragana('ha')).toBe('は');
    });

    it('converts hi to ひ', () => {
      expect(romajiToHiragana('hi')).toBe('ひ');
    });

    it('converts fu to ふ', () => {
      expect(romajiToHiragana('fu')).toBe('ふ');
    });

    it('converts hu to ふ (wapuro variant)', () => {
      expect(romajiToHiragana('hu')).toBe('ふ');
    });

    it('converts he to へ', () => {
      expect(romajiToHiragana('he')).toBe('へ');
    });

    it('converts ho to ほ', () => {
      expect(romajiToHiragana('ho')).toBe('ほ');
    });
  });

  describe('m-row', () => {
    it('converts ma to ま', () => {
      expect(romajiToHiragana('ma')).toBe('ま');
    });

    it('converts mi to み', () => {
      expect(romajiToHiragana('mi')).toBe('み');
    });

    it('converts mu to む', () => {
      expect(romajiToHiragana('mu')).toBe('む');
    });

    it('converts me to め', () => {
      expect(romajiToHiragana('me')).toBe('め');
    });

    it('converts mo to も', () => {
      expect(romajiToHiragana('mo')).toBe('も');
    });
  });

  describe('y-row', () => {
    it('converts ya to や', () => {
      expect(romajiToHiragana('ya')).toBe('や');
    });

    it('converts yu to ゆ', () => {
      expect(romajiToHiragana('yu')).toBe('ゆ');
    });

    it('converts yo to よ', () => {
      expect(romajiToHiragana('yo')).toBe('よ');
    });
  });

  describe('r-row', () => {
    it('converts ra to ら', () => {
      expect(romajiToHiragana('ra')).toBe('ら');
    });

    it('converts ri to り', () => {
      expect(romajiToHiragana('ri')).toBe('り');
    });

    it('converts ru to る', () => {
      expect(romajiToHiragana('ru')).toBe('る');
    });

    it('converts re to れ', () => {
      expect(romajiToHiragana('re')).toBe('れ');
    });

    it('converts ro to ろ', () => {
      expect(romajiToHiragana('ro')).toBe('ろ');
    });
  });

  describe('w-row', () => {
    it('converts wa to わ', () => {
      expect(romajiToHiragana('wa')).toBe('わ');
    });

    it('converts wo to を', () => {
      expect(romajiToHiragana('wo')).toBe('を');
    });
  });

  describe('nn produces ん', () => {
    it('converts nn to ん', () => {
      expect(romajiToHiragana('nn')).toBe('ん');
    });

    it('converts n followed by consonant to ん + consonant', () => {
      expect(romajiToHiragana('nka')).toBe('んか');
    });

    it('converts n at end of word to ん', () => {
      expect(romajiToHiragana('pan')).toBe('ぱん');
    });

    it('converts n followed by vowel to な/に/ぬ/ね/の', () => {
      expect(romajiToHiragana('na')).toBe('な');
      expect(romajiToHiragana('ni')).toBe('に');
      expect(romajiToHiragana('nu')).toBe('ぬ');
      expect(romajiToHiragana('ne')).toBe('ね');
      expect(romajiToHiragana('no')).toBe('の');
    });

    it('handles nna correctly (ん + な)', () => {
      expect(romajiToHiragana('nna')).toBe('んな');
    });
  });

  describe('double consonant produces っ', () => {
    it('converts kka to っか', () => {
      expect(romajiToHiragana('kka')).toBe('っか');
    });

    it('converts ssa to っさ', () => {
      expect(romajiToHiragana('ssa')).toBe('っさ');
    });

    it('converts tta to った', () => {
      expect(romajiToHiragana('tta')).toBe('った');
    });

    it('converts ppa to っぱ', () => {
      expect(romajiToHiragana('ppa')).toBe('っぱ');
    });

    it('converts cchi to っち', () => {
      expect(romajiToHiragana('cchi')).toBe('っち');
    });

    it('converts ttsu to っつ', () => {
      expect(romajiToHiragana('ttsu')).toBe('っつ');
    });
  });

  describe('voiced consonants (dakuten)', () => {
    it('converts ga to が', () => {
      expect(romajiToHiragana('ga')).toBe('が');
    });

    it('converts gi to ぎ', () => {
      expect(romajiToHiragana('gi')).toBe('ぎ');
    });

    it('converts gu to ぐ', () => {
      expect(romajiToHiragana('gu')).toBe('ぐ');
    });

    it('converts ge to げ', () => {
      expect(romajiToHiragana('ge')).toBe('げ');
    });

    it('converts go to ご', () => {
      expect(romajiToHiragana('go')).toBe('ご');
    });

    it('converts za to ざ', () => {
      expect(romajiToHiragana('za')).toBe('ざ');
    });

    it('converts ji to じ', () => {
      expect(romajiToHiragana('ji')).toBe('じ');
    });

    it('converts zi to じ (wapuro variant)', () => {
      expect(romajiToHiragana('zi')).toBe('じ');
    });

    it('converts zu to ず', () => {
      expect(romajiToHiragana('zu')).toBe('ず');
    });

    it('converts ze to ぜ', () => {
      expect(romajiToHiragana('ze')).toBe('ぜ');
    });

    it('converts zo to ぞ', () => {
      expect(romajiToHiragana('zo')).toBe('ぞ');
    });

    it('converts da to だ', () => {
      expect(romajiToHiragana('da')).toBe('だ');
    });

    it('converts di to ぢ', () => {
      expect(romajiToHiragana('di')).toBe('ぢ');
    });

    it('converts du to づ', () => {
      expect(romajiToHiragana('du')).toBe('づ');
    });

    it('converts de to で', () => {
      expect(romajiToHiragana('de')).toBe('で');
    });

    it('converts do to ど', () => {
      expect(romajiToHiragana('do')).toBe('ど');
    });

    it('converts ba to ば', () => {
      expect(romajiToHiragana('ba')).toBe('ば');
    });

    it('converts bi to び', () => {
      expect(romajiToHiragana('bi')).toBe('び');
    });

    it('converts bu to ぶ', () => {
      expect(romajiToHiragana('bu')).toBe('ぶ');
    });

    it('converts be to べ', () => {
      expect(romajiToHiragana('be')).toBe('べ');
    });

    it('converts bo to ぼ', () => {
      expect(romajiToHiragana('bo')).toBe('ぼ');
    });
  });

  describe('half-voiced consonants (handakuten)', () => {
    it('converts pa to ぱ', () => {
      expect(romajiToHiragana('pa')).toBe('ぱ');
    });

    it('converts pi to ぴ', () => {
      expect(romajiToHiragana('pi')).toBe('ぴ');
    });

    it('converts pu to ぷ', () => {
      expect(romajiToHiragana('pu')).toBe('ぷ');
    });

    it('converts pe to ぺ', () => {
      expect(romajiToHiragana('pe')).toBe('ぺ');
    });

    it('converts po to ぽ', () => {
      expect(romajiToHiragana('po')).toBe('ぽ');
    });
  });

  describe('combination kana (youon)', () => {
    it('converts kya to きゃ', () => {
      expect(romajiToHiragana('kya')).toBe('きゃ');
    });

    it('converts kyu to きゅ', () => {
      expect(romajiToHiragana('kyu')).toBe('きゅ');
    });

    it('converts kyo to きょ', () => {
      expect(romajiToHiragana('kyo')).toBe('きょ');
    });

    it('converts sha to しゃ', () => {
      expect(romajiToHiragana('sha')).toBe('しゃ');
    });

    it('converts shu to しゅ', () => {
      expect(romajiToHiragana('shu')).toBe('しゅ');
    });

    it('converts sho to しょ', () => {
      expect(romajiToHiragana('sho')).toBe('しょ');
    });

    it('converts sya to しゃ (wapuro)', () => {
      expect(romajiToHiragana('sya')).toBe('しゃ');
    });

    it('converts cha to ちゃ', () => {
      expect(romajiToHiragana('cha')).toBe('ちゃ');
    });

    it('converts chu to ちゅ', () => {
      expect(romajiToHiragana('chu')).toBe('ちゅ');
    });

    it('converts cho to ちょ', () => {
      expect(romajiToHiragana('cho')).toBe('ちょ');
    });

    it('converts tya to ちゃ (wapuro)', () => {
      expect(romajiToHiragana('tya')).toBe('ちゃ');
    });

    it('converts nya to にゃ', () => {
      expect(romajiToHiragana('nya')).toBe('にゃ');
    });

    it('converts nyu to にゅ', () => {
      expect(romajiToHiragana('nyu')).toBe('にゅ');
    });

    it('converts nyo to にょ', () => {
      expect(romajiToHiragana('nyo')).toBe('にょ');
    });

    it('converts hya to ひゃ', () => {
      expect(romajiToHiragana('hya')).toBe('ひゃ');
    });

    it('converts mya to みゃ', () => {
      expect(romajiToHiragana('mya')).toBe('みゃ');
    });

    it('converts rya to りゃ', () => {
      expect(romajiToHiragana('rya')).toBe('りゃ');
    });

    it('converts gya to ぎゃ', () => {
      expect(romajiToHiragana('gya')).toBe('ぎゃ');
    });

    it('converts ja to じゃ', () => {
      expect(romajiToHiragana('ja')).toBe('じゃ');
    });

    it('converts ju to じゅ', () => {
      expect(romajiToHiragana('ju')).toBe('じゅ');
    });

    it('converts jo to じょ', () => {
      expect(romajiToHiragana('jo')).toBe('じょ');
    });

    it('converts jya to じゃ (wapuro)', () => {
      expect(romajiToHiragana('jya')).toBe('じゃ');
    });

    it('converts bya to びゃ', () => {
      expect(romajiToHiragana('bya')).toBe('びゃ');
    });

    it('converts pya to ぴゃ', () => {
      expect(romajiToHiragana('pya')).toBe('ぴゃ');
    });
  });

  describe('long vowels', () => {
    it('converts ou to おう', () => {
      expect(romajiToHiragana('ou')).toBe('おう');
    });

    it('converts uu to うう', () => {
      expect(romajiToHiragana('uu')).toBe('うう');
    });

    it('converts aa to ああ', () => {
      expect(romajiToHiragana('aa')).toBe('ああ');
    });

    it('converts ii to いい', () => {
      expect(romajiToHiragana('ii')).toBe('いい');
    });

    it('converts ee to ええ', () => {
      expect(romajiToHiragana('ee')).toBe('ええ');
    });

    it('converts ei to えい', () => {
      expect(romajiToHiragana('ei')).toBe('えい');
    });

    it('converts oo to おお', () => {
      expect(romajiToHiragana('oo')).toBe('おお');
    });
  });

  describe('complete words', () => {
    it('converts watashi to わたし', () => {
      expect(romajiToHiragana('watashi')).toBe('わたし');
    });

    it('converts nihongo to にほんご', () => {
      expect(romajiToHiragana('nihongo')).toBe('にほんご');
    });

    it('converts gakkou to がっこう', () => {
      expect(romajiToHiragana('gakkou')).toBe('がっこう');
    });

    it('converts kitte to きって', () => {
      expect(romajiToHiragana('kitte')).toBe('きって');
    });

    it('converts konnichiwa to こんにちは', () => {
      expect(romajiToHiragana('konnichiha')).toBe('こんにちは');
    });

    it('converts toukyou to とうきょう', () => {
      expect(romajiToHiragana('toukyou')).toBe('とうきょう');
    });

    it('converts ryokou to りょこう', () => {
      expect(romajiToHiragana('ryokou')).toBe('りょこう');
    });

    it('converts benkyou to べんきょう', () => {
      expect(romajiToHiragana('benkyou')).toBe('べんきょう');
    });

    it('converts shinbun to しんぶん', () => {
      expect(romajiToHiragana('shinbun')).toBe('しんぶん');
    });

    it('converts onna to おんな', () => {
      expect(romajiToHiragana('onna')).toBe('おんな');
    });

    it('converts denwa to でんわ', () => {
      expect(romajiToHiragana('denwa')).toBe('でんわ');
    });
  });

  describe('case insensitivity', () => {
    it('converts uppercase to lowercase internally', () => {
      expect(romajiToHiragana('KA')).toBe('か');
      expect(romajiToHiragana('WATASHI')).toBe('わたし');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(romajiToHiragana('')).toBe('');
    });

    it('handles mixed hiragana and romaji', () => {
      // Already converted hiragana should pass through
      expect(romajiToHiragana('あka')).toBe('あか');
    });

    it('passes through unknown characters', () => {
      expect(romajiToHiragana('123')).toBe('123');
      expect(romajiToHiragana('ka123ko')).toBe('か123こ');
    });
  });
});

describe('processRomajiInput', () => {
  describe('real-time input processing', () => {
    it('returns initial state for empty input', () => {
      const result = processRomajiInput('');
      expect(result.hiragana).toBe('');
      expect(result.pending).toBe('');
    });

    it('keeps single consonant as pending', () => {
      const result = processRomajiInput('k');
      expect(result.hiragana).toBe('');
      expect(result.pending).toBe('k');
    });

    it('converts completed syllable and clears pending', () => {
      const result = processRomajiInput('ka');
      expect(result.hiragana).toBe('か');
      expect(result.pending).toBe('');
    });

    it('handles partial multi-character sequences', () => {
      const result = processRomajiInput('sh');
      expect(result.hiragana).toBe('');
      expect(result.pending).toBe('sh');
    });

    it('converts shi correctly', () => {
      const result = processRomajiInput('shi');
      expect(result.hiragana).toBe('し');
      expect(result.pending).toBe('');
    });

    it('handles n followed by consonant correctly', () => {
      const result = processRomajiInput('nk');
      expect(result.hiragana).toBe('ん');
      expect(result.pending).toBe('k');
    });

    it('keeps n as pending when not yet determined', () => {
      const result = processRomajiInput('n');
      expect(result.hiragana).toBe('');
      expect(result.pending).toBe('n');
    });

    it('handles double consonant correctly', () => {
      const result = processRomajiInput('kk');
      expect(result.hiragana).toBe('っ');
      expect(result.pending).toBe('k');
    });

    it('handles words with double consonant', () => {
      const result = processRomajiInput('gakko');
      expect(result.hiragana).toBe('がっこ');
      expect(result.pending).toBe('');
    });

    it('handles tch combination', () => {
      const result = processRomajiInput('matchi');
      expect(result.hiragana).toBe('まっち');
      expect(result.pending).toBe('');
    });
  });

  describe('incremental input simulation', () => {
    it('simulates typing watashi character by character', () => {
      let state: RomajiInputState;

      state = processRomajiInput('w');
      expect(state).toEqual({ hiragana: '', pending: 'w' });

      state = processRomajiInput('wa');
      expect(state).toEqual({ hiragana: 'わ', pending: '' });

      state = processRomajiInput('wat');
      expect(state).toEqual({ hiragana: 'わ', pending: 't' });

      state = processRomajiInput('wata');
      expect(state).toEqual({ hiragana: 'わた', pending: '' });

      state = processRomajiInput('watas');
      expect(state).toEqual({ hiragana: 'わた', pending: 's' });

      state = processRomajiInput('watash');
      expect(state).toEqual({ hiragana: 'わた', pending: 'sh' });

      state = processRomajiInput('watashi');
      expect(state).toEqual({ hiragana: 'わたし', pending: '' });
    });

    it('simulates typing gakkou character by character', () => {
      let state: RomajiInputState;

      state = processRomajiInput('g');
      expect(state).toEqual({ hiragana: '', pending: 'g' });

      state = processRomajiInput('ga');
      expect(state).toEqual({ hiragana: 'が', pending: '' });

      state = processRomajiInput('gak');
      expect(state).toEqual({ hiragana: 'が', pending: 'k' });

      state = processRomajiInput('gakk');
      expect(state).toEqual({ hiragana: 'がっ', pending: 'k' });

      state = processRomajiInput('gakko');
      expect(state).toEqual({ hiragana: 'がっこ', pending: '' });

      state = processRomajiInput('gakkou');
      expect(state).toEqual({ hiragana: 'がっこう', pending: '' });
    });

    it('simulates typing nihon with final n', () => {
      let state: RomajiInputState;

      state = processRomajiInput('n');
      expect(state).toEqual({ hiragana: '', pending: 'n' });

      state = processRomajiInput('ni');
      expect(state).toEqual({ hiragana: 'に', pending: '' });

      state = processRomajiInput('nih');
      expect(state).toEqual({ hiragana: 'に', pending: 'h' });

      state = processRomajiInput('niho');
      expect(state).toEqual({ hiragana: 'にほ', pending: '' });

      state = processRomajiInput('nihon');
      expect(state).toEqual({ hiragana: 'にほ', pending: 'n' });

      // When user stops typing, the trailing n should be ん
      // This is handled by forcing completion
    });
  });

  describe('backspace handling', () => {
    it('handles deletion of partial romaji', () => {
      // User types 'ka', then backspace
      let state = processRomajiInput('ka');
      expect(state).toEqual({ hiragana: 'か', pending: '' });

      // After backspace, we have 'k'
      state = processRomajiInput('k');
      expect(state).toEqual({ hiragana: '', pending: 'k' });
    });

    it('handles deletion in the middle of a word', () => {
      // User types 'watashi', result is わたし
      let state = processRomajiInput('watashi');
      expect(state.hiragana).toBe('わたし');

      // User backspaces to 'watas', result should be わた + pending 's'
      state = processRomajiInput('watas');
      expect(state).toEqual({ hiragana: 'わた', pending: 's' });

      // User backspaces to 'wata', result should be わた
      state = processRomajiInput('wata');
      expect(state).toEqual({ hiragana: 'わた', pending: '' });
    });

    it('recalculates entire string on each call', () => {
      // This is important - processRomajiInput always recalculates from scratch
      // to handle backspace correctly
      const state1 = processRomajiInput('ka');
      const state2 = processRomajiInput('ka');
      expect(state1).toEqual(state2);
    });
  });

  describe('forcing trailing n completion', () => {
    it('can force trailing n to become ん', () => {
      const state = processRomajiInput('nihon', true);
      expect(state.hiragana).toBe('にほん');
      expect(state.pending).toBe('');
    });

    it('does not force completion when not requested', () => {
      const state = processRomajiInput('nihon', false);
      expect(state.hiragana).toBe('にほ');
      expect(state.pending).toBe('n');
    });

    it('handles nn correctly without force', () => {
      const state = processRomajiInput('nihonno', false);
      expect(state.hiragana).toBe('にほんの');
      expect(state.pending).toBe('');
    });
  });
});

describe('isAllHiragana', () => {
  describe('valid hiragana', () => {
    it('returns true for single hiragana character', () => {
      expect(isAllHiragana('あ')).toBe(true);
    });

    it('returns true for multiple hiragana characters', () => {
      expect(isAllHiragana('わたし')).toBe(true);
    });

    it('returns true for small kana', () => {
      expect(isAllHiragana('きゃ')).toBe(true);
      expect(isAllHiragana('っ')).toBe(true);
    });

    it('returns true for ん', () => {
      expect(isAllHiragana('ん')).toBe(true);
      expect(isAllHiragana('にほん')).toBe(true);
    });
  });

  describe('invalid input', () => {
    it('returns false for empty string', () => {
      expect(isAllHiragana('')).toBe(false);
    });

    it('returns false for romaji characters', () => {
      expect(isAllHiragana('a')).toBe(false);
      expect(isAllHiragana('watashi')).toBe(false);
    });

    it('returns false for mixed hiragana and romaji', () => {
      expect(isAllHiragana('あa')).toBe(false);
      expect(isAllHiragana('aあ')).toBe(false);
      expect(isAllHiragana('わたしka')).toBe(false);
    });

    it('returns false for katakana', () => {
      expect(isAllHiragana('ア')).toBe(false);
      expect(isAllHiragana('ワタシ')).toBe(false);
    });

    it('returns false for mixed hiragana and katakana', () => {
      expect(isAllHiragana('あア')).toBe(false);
    });

    it('returns false for kanji', () => {
      expect(isAllHiragana('日')).toBe(false);
      expect(isAllHiragana('日本')).toBe(false);
    });

    it('returns false for numbers', () => {
      expect(isAllHiragana('1')).toBe(false);
      expect(isAllHiragana('123')).toBe(false);
    });

    it('returns false for special characters', () => {
      expect(isAllHiragana('!')).toBe(false);
      expect(isAllHiragana('@')).toBe(false);
    });

    it('returns false for whitespace', () => {
      expect(isAllHiragana(' ')).toBe(false);
      expect(isAllHiragana('あ い')).toBe(false);
    });
  });
});

describe('isValidReadingInput', () => {
  describe('valid reading input', () => {
    it('returns true for valid romaji that converts to hiragana', () => {
      expect(isValidReadingInput('a')).toBe(true);
      expect(isValidReadingInput('watashi')).toBe(true);
      expect(isValidReadingInput('nihon')).toBe(true);
    });

    it('returns true for hiragana input directly', () => {
      expect(isValidReadingInput('あ')).toBe(true);
      expect(isValidReadingInput('わたし')).toBe(true);
    });

    it('returns true for romaji with double consonants', () => {
      expect(isValidReadingInput('gakkou')).toBe(true);
      expect(isValidReadingInput('kitte')).toBe(true);
    });

    it('returns true for romaji with youon', () => {
      expect(isValidReadingInput('kyou')).toBe(true);
      expect(isValidReadingInput('ryokou')).toBe(true);
    });
  });

  describe('invalid reading input', () => {
    it('returns false for empty string', () => {
      expect(isValidReadingInput('')).toBe(false);
    });

    it('returns false for whitespace only', () => {
      expect(isValidReadingInput(' ')).toBe(false);
      expect(isValidReadingInput('   ')).toBe(false);
    });

    it('returns false for unconvertible romaji', () => {
      expect(isValidReadingInput('xyz')).toBe(false);
      expect(isValidReadingInput('hello')).toBe(false);
    });

    it('returns false for partial romaji that cannot fully convert', () => {
      expect(isValidReadingInput('ky')).toBe(false);
      expect(isValidReadingInput('sh')).toBe(false);
    });

    it('returns false for katakana', () => {
      expect(isValidReadingInput('ワタシ')).toBe(false);
    });

    it('returns false for kanji', () => {
      expect(isValidReadingInput('日本')).toBe(false);
    });

    it('returns false for mixed valid and invalid characters', () => {
      expect(isValidReadingInput('あx')).toBe(false);
      expect(isValidReadingInput('watashix')).toBe(false);
    });

    it('returns false for numbers', () => {
      expect(isValidReadingInput('123')).toBe(false);
      expect(isValidReadingInput('a1')).toBe(false);
    });
  });
});
