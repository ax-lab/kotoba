# Task List

This is a list of TODOs related to in-progress features and tasks.

- TODO: handle long vowels with `-` in extended search
- TODO: fix handling of ASCII characters (e.g. "jmdict")


## Search improvements

- When sorting entries, give less weight to rare forms (e.g. ok or secondary readings)
- When searching phrases maximize coverage
  - Implement a "word starting at point" query
  - Query each word at each point
  - Implement a maximize function to cover all phrase
  - Sort matches based on word relevance/etc
  - Support for similar matching
- Sort/cull approximate matches by edit distance

## High priority features

- Word tagging / notes
- Sentences
