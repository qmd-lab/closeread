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
    
    for k, block in pairs(div.content) do
      if has_cr_prefix(block) then
        table.insert(body_content, block)
      else
        table.insert(sidebar_content, block)
      end
    end
    
    sidebar_col = pandoc.Div(sidebar_content, pandoc.Attr("", {"column", "sidebar_col"}, {width="30%"}))
    margin_col = pandoc.Div("", pandoc.Attr("", {"column"}, {width="10%"}))
    body_col = pandoc.Div(body_content, pandoc.Attr("", {"column"}, {width="55%", style="padding:20px; position:sticky;top:30vh;"}))
    layout = pandoc.Div({sidebar_col, margin_col, body_col}, pandoc.Attr("", {"columns", "column-page", "cr-sidebar"}, {}))

    return layout
  end
end

-- this function is fragile
-- should be extended to find cr prefix nested deeper into the block
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
          

return {
  Div = make_sidebar_layout
}