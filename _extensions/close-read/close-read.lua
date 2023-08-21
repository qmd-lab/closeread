
quarto.log.output("===== Sidebar Log =====")

function make_sidebar_layout(div)
  
  if div.classes:includes("cr-sidebar") then
    
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
        if not is_sticky(block) then
          return block
        else
          return {}
        end
      end
    }

    narrative_col = pandoc.Div(narrative_blocks,
      pandoc.Attr("", {"column", "sidebar_col"}, {width = "30%"}))
    sticky_col_stack = pandoc.Div(sticky_blocks,
      pandoc.Attr("", {"sticky_col_stack"}))
    sticky_col = pandoc.Div(sticky_col_stack,
      pandoc.Attr("", {"column", "sticky_col"}, {width = "55%"}))
    layout = pandoc.Div({narrative_col, sticky_col},
      pandoc.Attr("", {"columns", "column-page", table.unpack(div.classes)},
      {}))

    return layout
  end
end

function shift_class_to_block(block)
  
  if pandoc.utils.type(block.content) == "Inlines" then
    for i, inline in pairs(block.content) do
      if inline.attr ~= nil then

        for k,v in pairs(inline.attributes) do
          if k == "cr-id" then
            block.content[i].attributes:remove(
              find_in_arr(block.content[i].attributes, "cr-id"))
            -- wraps block in Div with attribute cr-id (and converts Para to Plain)
            block = pandoc.Div(block.content, pandoc.Attr("", {}, {"cr-id", v}))
            break
          end
        end

      end
    end
  end
  
  return block
end


function is_sticky(block)

  sticky_block_attribute = false
  sticky_inline_attribute = false
  
  if block.attributes ~= nil then
    for k,v in pairs(block.attributes) do
      if k == "cr-id" then
        sticky_block_attribute = true
        break
      end
    end
  end
  
  if pandoc.utils.type(block.content) == "Inlines" then
    for _, inline in pairs(block.content) do
      if inline.attr ~= nil then
        for k,v in pairs(inline.attributes) do
          if k == "cr-id" then
            sticky_inline_attriburw = true
            break
          end
        end
      end
    end
  end

  return sticky_block_attribute or sticky_inline_attribute
end

-- utility function
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
  Div = make_sidebar_layout
}