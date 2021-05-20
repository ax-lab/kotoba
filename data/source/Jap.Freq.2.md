# Jap.Freq.2.zip

Source: http://www.lexique.org/?page_id=250

> Gimenes, M., & New, B. (2015). Worldlex: Twitter and blog word frequencies
> for 66 languages. Behavior research methods, 1-10.

Contains two files:

- `Jap.Char.Freq.2.txt` - Character frequencies
- `Jap.Freq.2.txt` - Word frequencies

The files contain one entry per line, the first line being the header. Each line
contains TAB separated fields with the following fields:

- `Word` / `Character`
	- The literal word or character
- `BlogFreq`, `BlogFreqPm`, `BlogCD`, `BlogCDPc`
	- Frequency for the word on blogs in the source data
- `TwitterFreq`, `TwitterFreqPm`, `TwitterCD`, `TwitterCDPc`
	- Frequency of the word on twitter
- `NewsFreq`, `NewsFreqPm`, `NewsCD`, `NewsCDPc`
	- Frequency of the word on news sources

For each source, the following numbers are available:

- `Freq`: raw frequency.
- `FreqPm`: frequency per million.
- `CD`: contextual diversity.
- `CDPc`: percentage of contextual diversity.

The Japanese corpus source data is dated 2011 and details are as follows (the
number of words are in millions):

| Blogs   |          | Twitter |          | News    |         | Total   |
|---------|----------|---------|----------|---------|---------|---------|
| NbWords | NbDocs   | NbWords | NbDocs   | NbWords | NbDocs  |         |
| 14.86   | 664,309  | 11.91   | 667,119  | 14.12   | 312,916 | 40.89   |
