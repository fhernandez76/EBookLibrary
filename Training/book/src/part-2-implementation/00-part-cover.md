# Part II

## Implementation

> *Eight chapters that build the running system, from the innermost
> domain entity to the React and Blazor frontends.*

Part I established the architectural model and the empty solution. Part
II fills it. The chapters follow the dependency arrow inward-to-outward:
Domain (Chapter 4), then Application (Chapter 5), then Infrastructure
(Chapter 6), then Web API (Chapter 7), then the cross-cutting concern
of Authentication (Chapter 8), then Database & Migrations (Chapter 9),
then the two frontends in succession (Chapters 10 and 11).

Each chapter ends in a verifiable checkpoint and is meant to be read in
order. Skipping ahead is supported but not encouraged: the chapters
build on the same running solution, and a chapter that compiles depends
on the one before it having compiled.

The reference implementation in `Automatic/EBookLibrary/` carries the
complete code; the listings in these chapters show the parts that carry
the most lesson per line.
