--[[
  callouts.lua  —  Pandoc Lua filter for EBook Library Training Guide
  =====================================================================
  Transforms special Markdown patterns into named Word styles so that
  reference.docx applies colored callout box formatting.

  Transformations:
    1. Blockquotes starting with **Tip:**      → custom-style "Tip Box"
    2. Blockquotes starting with **Warning:**
                          or **Important:**   → custom-style "Warning Box"
    3. Blockquotes starting with **Note:**    → custom-style "Tip Box"
    4. Chapter-opening blockquotes (italics)  → custom-style "Block Text"
    5. Headings containing "Checkpoint ✅"    → custom-style "Checkpoint Box" label prepended
    6. Headings containing "🤖"              → custom-style "AI Assisted Box" label prepended

  Usage:
    pandoc ... --lua-filter=assets/callouts.lua
]]

local stringify = pandoc.utils.stringify

-- ─── Helper: get first inline text from a block list ──────────────────────────
local function firstInlineText(blocks)
  if #blocks == 0 then return '' end
  local first = blocks[1]
  if first.t == 'Para' or first.t == 'Plain' then
    return stringify(first)
  end
  return ''
end

-- ─── Helper: check if block list is all-italic (chapter quote) ───────────────
local function isAllItalic(blocks)
  if #blocks == 0 then return false end
  local first = blocks[1]
  if first.t ~= 'Para' and first.t ~= 'Plain' then return false end
  local inlines = first.content
  if #inlines == 0 then return false end
  -- All inlines should be Emph or space/str wrapping Emph
  for _, inline in ipairs(inlines) do
    if inline.t == 'Emph' then return true end
  end
  return false
end

-- ─── Helper: build a custom-style Div from blocks ────────────────────────────
local function makeCalloutDiv(style, blocks)
  local div = pandoc.Div(blocks)
  div.attributes['custom-style'] = style
  return div
end

-- ─── Helper: flatten blockquote blocks into plain paragraphs ─────────────────
local function flattenQuote(blocks)
  local result = {}
  for _, block in ipairs(blocks) do
    table.insert(result, block)
  end
  return result
end

-- ─── BlockQuote transform ─────────────────────────────────────────────────────
function BlockQuote(el)
  local text = firstInlineText(el.content)

  -- **Tip:** → Tip Box (blue)
  if text:match('^Tip:') or text:match('^%*%*Tip:%*%*') then
    return makeCalloutDiv('Tip Box', flattenQuote(el.content))
  end

  -- **Warning:** or **Important:** → Warning Box (burgundy)
  if text:match('^Warning:') or text:match('^Important:')
     or text:match('^%*%*Warning:%*%*') or text:match('^%*%*Important:%*%*') then
    return makeCalloutDiv('Warning Box', flattenQuote(el.content))
  end

  -- **Note:** or **Critical:** → Tip Box
  if text:match('^Note:') or text:match('^Critical:')
     or text:match('^%*%*Note:%*%*') or text:match('^%*%*Critical:%*%*') then
    return makeCalloutDiv('Tip Box', flattenQuote(el.content))
  end

  -- Chapter opening quote (italic text in blockquote) → Block Text
  if isAllItalic(el.content) then
    return makeCalloutDiv('Block Text', flattenQuote(el.content))
  end

  -- Generic blockquote → also Block Text (indented quote style)
  return makeCalloutDiv('Block Text', flattenQuote(el.content))
end

-- ─── Header transform ─────────────────────────────────────────────────────────
function Header(el)
  local text = stringify(el)

  -- Checkpoint ✅ section heading → prepend a green label paragraph
  if text:match('Checkpoint') and text:match('✅') then
    local label = pandoc.Div(
      { pandoc.Para({ pandoc.Strong({ pandoc.Str('✅  CHECKPOINT') }) }) },
      pandoc.Attr('', {}, { ['custom-style'] = 'Checkpoint Box' })
    )
    return { label, el }
  end

  -- 🤖 AI-Assisted heading → prepend a purple label paragraph
  if text:match('🤖') or text:match('AI%-Assisted') or text:match('AI.Assisted') then
    local label = pandoc.Div(
      { pandoc.Para({ pandoc.Strong({ pandoc.Str('🤖  AI-ASSISTED DEVELOPMENT NOTES') }) }) },
      pandoc.Attr('', {}, { ['custom-style'] = 'AI Assisted Box' })
    )
    return { label, el }
  end

  return el
end

-- ─── CodeBlock: mark as Source Code style ────────────────────────────────────
-- Pandoc already maps fenced code blocks to the "Source Code" paragraph style
-- when that style exists in reference.docx. No extra Lua needed for this.

-- ─── Table: add header-row shading via Div wrapper (best effort) ─────────────
-- Note: Pandoc DOCX tables get styling from reference.docx Table styles.
-- We can't easily apply per-cell color from Lua for DOCX, but the Word
-- table style "Table" in reference.docx can be customized.
-- We leave tables as-is and rely on Word's built-in table styles.
