--[[
  callouts.lua — Pandoc Lua filter for the EBook Library *Book Edition*
  =====================================================================
  Extends the original Training filter with four book-edition sidebar
  styles aimed at a junior→lead audience:

    > **Foundations:** ...        → custom-style "Foundations Box"   (green tint)
    > **Architect's Note:** ...   → custom-style "Architect Box"      (navy tint)
    > **Pitfall:** ...            → custom-style "Pitfall Box"        (red tint)
    > **In Practice:** ...        → custom-style "Practice Box"       (gray tint)

  Plus the legacy callouts (kept for back-compat with existing chapters):

    > **Tip:** | **Note:**        → "Tip Box"
    > **Warning:** | **Important:** → "Warning Box"
    > Italic blockquote           → "Block Text"
    Headings with "Checkpoint ✅" → prepend "Checkpoint Box" label
    Headings with "🤖"           → prepend "AI Assisted Box" label

  Figures: any image placed alone in a paragraph is wrapped with a
  caption paragraph styled "Figure Caption".

  Code listings: code blocks whose first line is a comment of the form
  `// Listing X.Y — caption` (any language comment marker accepted)
  get a "Listing Caption" paragraph emitted just above the code.

  Usage:
    pandoc ... --lua-filter=assets/styles/callouts.lua
]]

local stringify = pandoc.utils.stringify

-- ────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ────────────────────────────────────────────────────────────────────────────

local function firstInlineText(blocks)
  if #blocks == 0 then return '' end
  local first = blocks[1]
  if first.t == 'Para' or first.t == 'Plain' then
    return stringify(first)
  end
  return ''
end

local function isAllItalic(blocks)
  if #blocks == 0 then return false end
  local first = blocks[1]
  if first.t ~= 'Para' and first.t ~= 'Plain' then return false end
  local inlines = first.content
  if #inlines == 0 then return false end
  for _, inline in ipairs(inlines) do
    if inline.t == 'Emph' then return true end
  end
  return false
end

local function makeCalloutDiv(style, blocks)
  local div = pandoc.Div(blocks)
  div.attributes['custom-style'] = style
  return div
end

local function flattenQuote(blocks)
  local result = {}
  for _, block in ipairs(blocks) do
    table.insert(result, block)
  end
  return result
end

-- Strip a leading "**Label:**" run from the first paragraph so the body
-- of the callout reads cleanly inside the colored box. The label is then
-- re-emitted as a small bold heading in the box's own typography.
local function stripLeadingLabel(blocks, label)
  if #blocks == 0 then return blocks end
  local first = blocks[1]
  if first.t ~= 'Para' and first.t ~= 'Plain' then return blocks end
  local inlines = first.content
  -- Look for: Strong("Label:") then Space then ...
  if #inlines >= 1 and inlines[1].t == 'Strong' then
    local strongText = stringify(inlines[1])
    if strongText:find(label, 1, true) then
      local rest = {}
      local started = false
      for i = 2, #inlines do
        if not started and (inlines[i].t == 'Space' or inlines[i].t == 'SoftBreak') then
          -- skip leading space
        else
          started = true
          table.insert(rest, inlines[i])
        end
      end
      first.content = rest
      blocks[1] = first
    end
  end
  return blocks
end

-- ────────────────────────────────────────────────────────────────────────────
-- BlockQuote → callouts
-- ────────────────────────────────────────────────────────────────────────────

function BlockQuote(el)
  local text = firstInlineText(el.content)

  -- New book-edition sidebars (must be checked before generic Tip/Note)
  if text:match("^Foundations:") then
    local body = stripLeadingLabel(flattenQuote(el.content), 'Foundations')
    table.insert(body, 1,
      pandoc.Para({ pandoc.Strong({ pandoc.Str('FOUNDATIONS') }) }))
    return makeCalloutDiv('Foundations Box', body)
  end

  if text:match("^Architect.s? Note:") or text:match("^Architect Note:") then
    local body = stripLeadingLabel(flattenQuote(el.content), 'Architect')
    table.insert(body, 1,
      pandoc.Para({ pandoc.Strong({ pandoc.Str("ARCHITECT'S NOTE") }) }))
    return makeCalloutDiv('Architect Box', body)
  end

  if text:match("^Pitfall:") then
    local body = stripLeadingLabel(flattenQuote(el.content), 'Pitfall')
    table.insert(body, 1,
      pandoc.Para({ pandoc.Strong({ pandoc.Str('PITFALL') }) }))
    return makeCalloutDiv('Pitfall Box', body)
  end

  if text:match("^In Practice:") then
    local body = stripLeadingLabel(flattenQuote(el.content), 'In Practice')
    table.insert(body, 1,
      pandoc.Para({ pandoc.Strong({ pandoc.Str('IN PRACTICE') }) }))
    return makeCalloutDiv('Practice Box', body)
  end

  -- Legacy callouts
  if text:match("^Tip:") then
    return makeCalloutDiv('Tip Box', flattenQuote(el.content))
  end
  if text:match("^Warning:") or text:match("^Important:") then
    return makeCalloutDiv('Warning Box', flattenQuote(el.content))
  end
  if text:match("^Note:") or text:match("^Critical:") then
    return makeCalloutDiv('Tip Box', flattenQuote(el.content))
  end

  -- Italic blockquote (chapter-opening epigraph)
  if isAllItalic(el.content) then
    return makeCalloutDiv('Block Text', flattenQuote(el.content))
  end

  return makeCalloutDiv('Block Text', flattenQuote(el.content))
end

-- ────────────────────────────────────────────────────────────────────────────
-- Header transforms (legacy Checkpoint / AI labels)
-- ────────────────────────────────────────────────────────────────────────────

function Header(el)
  local text = stringify(el)

  if text:match('Checkpoint') and text:match('✅') then
    local label = pandoc.Div(
      { pandoc.Para({ pandoc.Strong({ pandoc.Str('✅  CHECKPOINT') }) }) },
      pandoc.Attr('', {}, { ['custom-style'] = 'Checkpoint Box' })
    )
    return { label, el }
  end

  if text:match('🤖') or text:match('AI%-Assisted') then
    local label = pandoc.Div(
      { pandoc.Para({ pandoc.Strong({ pandoc.Str('🤖  AI-ASSISTED DEVELOPMENT NOTES') }) }) },
      pandoc.Attr('', {}, { ['custom-style'] = 'AI Assisted Box' })
    )
    return { label, el }
  end

  return el
end

-- ────────────────────────────────────────────────────────────────────────────
-- Image captions: a paragraph containing a single image with alt text
-- becomes  ┌ image ┐
--          └ Figure caption (custom-style "Figure Caption") ┘
-- The alt text becomes the caption.
-- ────────────────────────────────────────────────────────────────────────────

function Para(el)
  if #el.content == 1 and el.content[1].t == 'Image' then
    local img = el.content[1]
    local altText = stringify(img.caption)
    if altText == '' then
      altText = stringify(img.alt or {})
    end
    local imgPara = pandoc.Para({ img })
    if altText == '' then
      return imgPara
    end
    local capDiv = pandoc.Div(
      { pandoc.Para({ pandoc.Emph({ pandoc.Str(altText) }) }) },
      pandoc.Attr('', {}, { ['custom-style'] = 'Figure Caption' })
    )
    return { imgPara, capDiv }
  end
  return el
end
