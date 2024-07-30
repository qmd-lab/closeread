--===============--
-- Closeread.lua --
--===============--
-- This script creates the functions/filters that are used to process 
-- a closeread document into the initial HTML file that is loaded by
-- the browser. The filters are actually run at the very bottom of the
-- script, so to understand the script it might be easiest to start there.

-- set defaults
local debug_mode = false
local trigger_selectors = {["focus-on"] = true}
local cr_attributes = {["pan-to"] = true, ["scale-by"] = true}
local layout_type = "sidebar"
local layout_side = "left"
local layout_sides = { "left", "right", "center" }
local remove_header_space = false


--======================--
-- Process YAML options --
--======================--

function read_meta(m)

  -- debug mode
  if m["debug-mode"] ~= nil then
    debug_mode = m["debug-mode"]
  end

  -- remove-header-space
  if m["remove-header-space"] ~= nil then
    remove_header_space = m["remove-header-space"]
  end

  -- layout options

  -- check for disallowed values or use of both layouts simultaneously
  if m["sidebar-side"] ~= nil and m["overlay-side"] ~= nil then
    quarto.log.error(
      "Closeread error: use either the `sidebar-side` option or the " ..
      "`overlay-side` option, not both.")
  end
  if m["sidebar-side"] ~= nil and m["sidebar-side"][1].text ~= "left" and m["sidebar-side"][1].text ~= "right" then
    quarto.log.error("Closeread error: `sidebar-side` should be one of " ..
      "`left`, or `right`, not `" .. m["sidebar-side"][1].text .. "`")
    
  end
  if m["overlay-side"] ~= nil and m["overlay-side"][1].text ~= "left" and m["overlay-side"][1].text ~= "center" and m["overlay-side"][1].text ~= "right" then
    quarto.log.error("Closeread error: `overlay-side` should be one of " ..
      "`left`, `center` or `right`, not `" .. m["sidebar-side"][1].text .. "`")
  end
  
  -- set layout type and side if specified
  if m["sidebar-side"] ~= nil then
    layout_type = "sidebar"
    layout_side = m["sidebar-side"][1].text
  end
  if m["overlay-side"] ~= nil then
    layout_type = "overlay"
    layout_side = m["overlay-side"][1].text
  end
  -- quarto.log.output("Default layout: " .. layout_type .. " " .. layout_side)
  
  -- inject layout options into html <meta>
  quarto.doc.include_text("in-header", "<meta cr-layout-type='" ..
    tostring(layout_type) .. "'>")
  quarto.doc.include_text("in-header", "<meta cr-layout-side='" ..
    tostring(layout_side) .. "'>")
  
  -- inject debug mode option in html <meta>
  quarto.doc.include_text("in-header", "<meta cr-debug-mode='" ..
    tostring(debug_mode) .. "'>")

  -- inject remove_header_space options into html <meta>
  quarto.doc.include_text("in-header", "<meta cr-remove-header-space='" ..
    tostring(remove_header_space) .. "'>")
  
end


--=====================--
-- Form CR-Section AST --
--=====================--

-- Construct cr section AST
function make_section_layout(div)
  
  if div.classes:includes("cr-section") then
    
    -- make contents of stick-col
    sticky_blocks = div.content:walk {
      traverse = 'topdown',
      Block = function(block)
        if is_sticky(block) then
          block = shift_id_to_block(block)
          block.classes:insert("sticky") 
          return block, false -- if a sticky element is found, don't process child blocks
        else
          return {}
        end
      end
    }
    
    -- make contents of narrative-col
    narrative_blocks = {}
    for _,block in ipairs(div.content) do
      quarto.log.output(">>> narrative_blocks:", narrative_blocks)
      if not is_sticky(block) then
        if is_trigger(block) then
          table.insert(block.attr.classes, "narrative")
          table.insert(block.attr.classes, "trigger")
          table.insert(narrative_blocks, block)
        else
          local wrapped_block = pandoc.Div(block, pandoc.Attr("", {"narrative"}, {}))
          table.insert(narrative_blocks, wrapped_block)
        end
      end
    end

    -- piece together the cr-section
    narrative_col = pandoc.Div(pandoc.Blocks(narrative_blocks),
      pandoc.Attr("", {"narrative-col"}, {}))
    sticky_col_stack = pandoc.Div(sticky_blocks,
      pandoc.Attr("", {"sticky-col-stack"}))
    sticky_col = pandoc.Div(sticky_col_stack,
      pandoc.Attr("", {"sticky-col"}, {}))
    cr_section = pandoc.Div({narrative_col, sticky_col},
      pandoc.Attr("", {"column-screen", table.unpack(div.classes)},
      {}))

    return cr_section
  end
end


function shift_id_to_block(block)

  -- if block contains inlines...
  if pandoc.utils.type(block.content) == "Inlines" then
    -- ... iterate over the inlines...
    for i, inline in pairs(block.content) do
      if inline.identifier ~= nil then
        -- ... to find a "cr-" identifier on the child inline
        if string.match(inline.identifier, "^cr-") then
          -- remove id from the child inline
          local id_to_move = inline.identifier
          block.content[i].attr.identifier = ""
          -- and wrap block in Div with #cr- (and converts Para to Plain)
          block = pandoc.Div(block.content, pandoc.Attr(id_to_move, {}, {}))
        end
      end
    end
  end
            
  return block
end


-- wrap_block: wrap trigger blocks in a div that allows us to style triggers visually
function wrap_block(block)
  
  -- extract attributes
  local attributesToMove = {}
  for attr, value in pairs(block.attributes) do
    if trigger_selectors[attr] or cr_attributes[attr] then
      attributesToMove[attr] = value
      block.attributes[attr] = nil
    end
  end
  
  -- finally construct a pandoc.div with the new details and content to return
  return pandoc.Div(block, pandoc.Attr("", {"trigger"}, attributesToMove))
end


function is_sticky(block)

  sticky_block_id = false
  sticky_inline_id = false
  
  if block.identifier ~= nil then
    if string.match(block.identifier, "^cr-") then
      sticky_block_id = true
    end
  end
  
  if pandoc.utils.type(block.content) == "Inlines" then
    for _, inline in pairs(block.content) do
      if inline.identifier ~= nil then
        if string.match(inline.identifier, "^cr-") then
          sticky_inline_id = true
        end
      end
    end
  end

  return sticky_block_id or sticky_inline_id
end


function is_trigger(block)
  -- it can't be a trigger without attributes
  if block.attributes == nil then
    return false
  end
  
  -- if it has attributes, they must match a selector
  local is_trigger = false
  for selector, _ in pairs(trigger_selectors) do
    if block.attributes[selector] then
      is_trigger = true
      break
    end
  end
  
  return is_trigger
end


function find_in_arr(arr, value)
    for i, v in pairs(arr) do
        if v == value then
            return i
        end
    end
end


--======================--
-- Lineblock Attributes --
--======================--

-- Append attributes to any cr line blocks
function add_attributes(lineblock)
  local first_line = lineblock.content[1]
  
  if first_line[1].t == "Str" and first_line[1].text:sub(1,1) == "{" then
    local id = extractIds(first_line)[1]
    local classes = extractClasses(first_line)
    local attr_tab = extractAttr(first_line)
    
    table.remove(lineblock.content, 1)
    lineblock = pandoc.Div(lineblock, pandoc.Attr(id, classes, attr_tab))
  end
  
  return lineblock
end


function extractAttr(el)
  local attr_tab = {}
  local keys_tab = {}
  local vals_tab = {}
  local key_inds = {}
  local ind = 0
  
  -- gather keys and their index
  for _,v in ipairs(el) do
    ind = ind + 1
    if v.t == "Str" then
      v.text = v.text:gsub("[{}]", "")
      if v.text:sub(-1) == "=" then
        table.insert(keys_tab, v.text:sub(1, -2))
        table.insert(key_inds, ind)
      end
    end
  end
  
  -- gather values from index + 1
  for _,v in ipairs(key_inds) do
    if el[v + 1].t == "Quoted" then
      table.insert(vals_tab, el[v + 1].content[1].text)
    else
      table.insert(vals_tab, "")
    end
  end
  
  -- zip them together
  for i = 1, #keys_tab do
    attr_tab[keys_tab[i]] = vals_tab[i]
  end
  
  return attr_tab
end


function extractIds(el)
  local ids = {}
  for _,v in ipairs(el) do
    if v.t == "Str" then
      v.text = v.text:gsub("[{}]", "")
      if v.text:sub(1, 1) == "#" then
        table.insert(ids, v.text:sub(2))
      end
    end
  end
  
  return ids
end


function extractClasses(el)
  local classes = {}
  for _,v in ipairs(el) do
    if v.t == "Str" then
      if v.text:sub(1, 1) == "." then
        table.insert(classes, v.text:sub(2))
      end
    end
  end
  return classes
end


--================--
-- HTML Injection --
--================--

quarto.doc.add_html_dependency({
  name = "intersection-observer-polyfill",
  version = "1.0.0",
  scripts = {"intersection-observer.js"}
})
quarto.doc.add_html_dependency({
  name = "scrollama",
  version = "3.2.0",
  scripts = {"scrollama.min.js"}
})
quarto.doc.add_html_dependency({
  name = "closereadjs",
  version = "0.0.1",
  scripts = {"closeread.js"}
})


--=============--
-- Run Filters --
--=============--

return {
  {
    LineBlock = add_attributes
  },
  {
    Meta = read_meta,
    Div = make_section_layout,
    Pandoc = add_classes_to_body
  }
}
