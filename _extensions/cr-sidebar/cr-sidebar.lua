--* for every Div
    --* if its a cr-sidebar div
      --* for all blocks
        --* if it has a cr-id
          --* save it as body
        --* else
          --* save into sidebar table of blocks
      --* end for
      --* create new div with column and column page class
      --*  - with three divs, one for each column (with middle col)
      --* return new div

quarto.log.output("===== Sidebar Log =====")

function make_sidebar_layout(div)
  
  if div.classes:includes("cr-sidebar") then
    body_content = {}
    sidebar_content = {}
    
    pandoc.walk_block(div, {
      
      -- this function will make one block_list for every level
      -- of nesting that exists in the div
      Blocks = function(block_list) 
        --quarto.log.output(">>>>>", block_list)
        
        for _, block in pairs(block_list) do
          quarto.log.output(">>>>> key: ", _)
          quarto.log.output(">>>>> is sticky: ", is_sticky(block))
          quarto.log.output(">>>>> value: ", block)
          
          --if has_cr_prefix2() then
          --  table.insert(body_content, v)
          --else
          --  table.insert(sidebar_content, v)
          --end
        end
        
      end
    })
  
   --TODO: get has_cr_prefix2 to run over the lists-of-blocks-that 
   -- come through the walk_blocks fun. (maybe :walk) would work better?
   
    
    sidebar_col = pandoc.Div(sidebar_content,
      pandoc.Attr("", {"column", "sidebar_col"}, {width = "30%"}))
    body_col_stack = pandoc.Div(body_content,
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
  sticky_block = false
  sticky_inline = false
  
  if block.attr ~= nil then
    sticky_block = block.attr.classes:includes("sticky")
  end
  
  if pandoc.utils.type(block.content) == "Inlines" then
    for _, inline in pairs(block.content) do
      if inline.attr ~= nil then
        sticky_inline = inline.attr.classes:includes("sticky")
      end
    end
  end

  return sticky_block or sticky_inline
end

-- this function won't catch blocks with the cr attribute nested more
-- deeply within the block
function has_cr_prefix(block)
  answer = false
  if block.attributes ~= nil then
    for k,v in pairs(block.attributes) do
      if string.sub(k, 1, 3) == "cr-" then
        answer = true
        break
      end
    end
  end
  return answer
end

-- this function is a bit better; it also catches a sticky object if it is the
-- first element nested one deep (which catches math and image inside para)
function has_sticky(block)
  answer = false
  -- if the block itself is sticky
  if block.attributes ~= nil then
    for k,v in pairs(block.attributes) do
      if string.sub(k, 1, 3) == "cr-" then
        answer = true
        break
      end
    end
  -- or if it contains an inline that's sticky
  elseif block.content[1].attributes ~= nil then
    for k,v in pairs(block.content[1].attributes) do
      if string.sub(k, 1, 3) == "cr-" then
        answer = true
        break
      end
    end
  end

  return answer
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