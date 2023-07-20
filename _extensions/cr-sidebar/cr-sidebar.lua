--* for every Div
    --* if its a cr-sidebar div
      --* for all blocks
        --* if it has a cr-id
          --* save it as body
        --* else
          --* save into sidebar table of blocks
      --* end for
      -- create new div with column and column page class
      --  - with three divs, one for each column (with middle col)
      -- return new div

quarto.log.output("===== Sidebar Log =====")

function make_sidebar_layout(div)
  sidebar = {}
  
  if div.classes:includes("cr-sidebar") then
    for k, block in pairs(div.content) do
      --quarto.log.output("== next block ==")
      --quarto.log.output("key: ", k)
      --quarto.log.output(block)
      --quarto.log.output(">>>>> ", has_cr_prefix(block))
      if has_cr_prefix(block) then
        body = block
      else
        table.insert(sidebar, block)
      end
    end
    table.insert(sidebar, 1, body)
    quarto.log.output(sidebar)
  end
end

-- this function is fragile
-- should be extended to find cr prefix nested deeper into the block
function has_cr_prefix(block)
  answer = false
  if block.attributes ~= nil then
    for k,v in pairs(block.attributes) do
      if string.sub(k, 1, 2) == "cr" then
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