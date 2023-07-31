
quarto.log.output("===== Sidebar Log =====")

function make_sidebar_layout(div)
  
  if div.classes:includes("cr-sidebar") then
    
    sticky_blocks = div.content:walk {
      traverse = 'topdown',
      Block = function(block)
        quarto.log.output(">>>>> is sticky: ", is_sticky(block))
        quarto.log.output(">>>>> block: ", block)
        if is_sticky(block) then
          return block, false -- if a sticky element is found, don't process child blocks
        else
          return {}
        end
      end
    }
    
    non_sticky_blocks = div.content:walk {
      traverse = 'topdown',
      Block = function(block)
        if not is_sticky(block) then
          return block
        else
          return {}
        end
      end
    }

    quarto.log.output("<><><> Sticky Blocks <><><>")
    quarto.log.output(sticky_blocks)
    quarto.log.output("<><><> Non Sticky Blocks <><><>")
    quarto.log.output(non_sticky_blocks)

    sidebar_col = pandoc.Div(non_sticky_blocks,
      pandoc.Attr("", {"column", "sidebar_col"}, {width = "30%"}))
    body_col_stack = pandoc.Div(sticky_blocks,
      pandoc.Attr("", {"body_col_stack"}))
    body_col = pandoc.Div(body_col_stack,
      pandoc.Attr("", {"column", "body_col"}, {width = "55%"}))
    layout = pandoc.Div({sidebar_col, body_col},
      pandoc.Attr("", {"columns", "column-page", table.unpack(div.classes)},
      {}))

    return layout
  end
end

function is_sticky(block)

  sticky_block_class = false
  sticky_block_attribute = false
  sticky_inline_class = false
  
  if block.attr ~= nil then
    sticky_block_class = block.attr.classes:includes("cr-sticky")
  end
    
  if block.attributes ~= nil then
    for k,v in pairs(block.attributes) do
      if k == "cr" and v == "sticky" then
        sticky_block_attribute = true
        break
      end
    end
  end
  
  if pandoc.utils.type(block.content) == "Inlines" then
    for _, inline in pairs(block.content) do
      if inline.attr ~= nil then
        sticky_inline_class = inline.attr.classes:includes("cr-sticky")
      end
    end
  end

  return sticky_block_class or sticky_block_attribute or sticky_inline_class
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