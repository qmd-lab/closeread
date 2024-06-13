
quarto.log.output("===== Closeread Log =====")

-- set defaults
local debug_mode = false
local step_selectors = {["change-to"] = true, ["focus-on"] = true}
local focus_attributes = {["highlight-spans"] = true, ["highlight-lines"] = true}


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



-- Read in YAML options
function read_meta(m)

  if m["debug-mode"] ~= nil then
    debug_mode = m["debug-mode"]
  end
  
  -- make accessible to scroller-init.js via <meta> tag
  quarto.doc.include_text("in-header", "<meta cr-debug-mode='" .. tostring(debug_mode) .. "'>")
  
end

-- Construct sticky sidebar AST
function make_sidebar_layout(div)
  
  if div.classes:includes("cr-layout") then
    
    sticky_blocks = div.content:walk {
      traverse = 'topdown',
      Block = function(block)
        if is_sticky(block) then
          block = shift_class_to_block(block)
          return block, false -- if a sticky element is found, don't process child blocks
        else
          return {}
        end
      end
    }
    
    narrative_blocks = div.content:walk {
      traverse = 'topdown',
      Block = function(block)
        -- return only the non-sticky blocks...
        if not is_sticky(block) then
          -- but check for step blocks
          if block.attributes ~= nil and is_step(block) then
            -- and and wrap it in an enclosing div
            return wrap_block(block)
          else
            return block
          end
        else
          return {}
        end
      end
    }

    narrative_col = pandoc.Div(narrative_blocks,
      pandoc.Attr("", {"sidebar-col"}, {}))
    sticky_col_stack = pandoc.Div(sticky_blocks,
      pandoc.Attr("", {"sticky-col-stack"}))
    sticky_col = pandoc.Div(sticky_col_stack,
      pandoc.Attr("", {"sticky-col"}, {}))
    layout = pandoc.Div({narrative_col, sticky_col},
      pandoc.Attr("", {"cr-layout", "column-screen", table.unpack(div.classes)},
      {style = "grid-template-columns: 1fr 3fr;"}))

    return layout
  end
end

function shift_class_to_block(block)

  -- if block contains inlines...
  if pandoc.utils.type(block.content) == "Inlines" then
    -- ... iterate over the inlines...
    for i, inline in pairs(block.content) do
      if inline.attr ~= nil then
        -- ... to find a "data-cr-id" or "cr-id" attribute on the child inline
        for k,v in pairs(inline.attributes) do
          if k == "data-cr-id" or k == "cr-id" then
            -- remove attribute from the child inline
            block.content[i].attributes[k] = nil
            -- wraps block in Div with attribute cr-id (and converts Para to Plain)
            block = pandoc.Div(block.content, pandoc.Attr("", {}, {{k, v}}))
            break
          end
        end

      end
    end
  end
  
  return block
end

-- wrap_block: wrap step blocks in a div that allows us to style steps visually
function wrap_block(block)
  
  -- extract attributes
  local attributesToMove = {}
  for attr, value in pairs(block.attributes) do
    if step_selectors[attr] or focus_attributes[attr] then
      attributesToMove[attr] = value
      block.attributes[attr] = nil
    end
  end
  
  -- finally construct a pandoc.div with the new details and content to return
  return pandoc.Div(block, pandoc.Attr("", "", attributesToMove))
end


function is_sticky(block)

  sticky_block_attribute = false
  sticky_inline_attribute = false
  
  if block.attributes ~= nil then
    for k,v in pairs(block.attributes) do
      if k == "cr-id" or k == "data-cr-id" then
        sticky_block_attribute = true
        break
      end
    end
  end
  
  if pandoc.utils.type(block.content) == "Inlines" then
    for _, inline in pairs(block.content) do
      if inline.attr ~= nil then
        for k,v in pairs(inline.attributes) do
          if k == "cr-id" or k == "data-cr-id" then
            sticky_inline_attribute = true
            break
          end
        end
      end
    end
  end

  return sticky_block_attribute or sticky_inline_attribute
end

-- utility functions

function is_step(block) 
  local is_step = false
  for selector, _ in pairs(step_selectors) do
    if block.attributes[selector] then
      is_step = true
      break
    end
  end
  return is_step
end

function find_in_arr(arr, value)
    for i, v in pairs(arr) do
        if v == value then
            return i
        end
    end
end

-- add scrollama.js, the intersection-observer polyfill and our scroller init
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
  name = "cr-sidebar-scroller-init",
  version = "0.0.1",
  scripts = {"scroller-init.js"}
})

-- TODO - add a js scrollama setup step (can i do this with a js script + yaml?)

return {
  {LineBlock = add_attributes},
  {Meta = read_meta,
  Div = make_sidebar_layout}
}
