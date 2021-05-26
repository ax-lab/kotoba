# jlpt.json

Compiled from http://www.tanos.co.uk/jlpt/

The root object has fields "1" to "5" for each of the JLPT levels.

Each entry has a "kanji" and a "vocab" list of strings. 

- The kanji list contains the literal kanji for that level.
- The vocab list contains a string in the format specified below.

## Vocabulary listing

The vocabulary entries start with the entry in kanji form, followed by `: `,
and followed by the readings.

Some entries don't have the kanji form available (which does not mean they are
kana-only entries in the dictionary). 

Readings are not normalized: some are in katakana and some in hiragana.

Some entries have multiple forms split by a `/` and/or spaces.

For some entries usually written as kana, the reading/kanji forms are reversed.

Note that some entries are duplicated within a level and across levels with
different readings.
