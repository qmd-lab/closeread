--* for every Div
    --* if its a cr-sidebar div
      -- for all blocks TODO: this method of iterating over the blocks isn't working (line 21)
        -- if it has a cr-id
          -- save it as body
        -- else
          -- save into sidebar list of blocks
      -- end for
      -- create new div with column and column page class
      --  - with three divs, one for each column (with middle col)
      -- return new div

quarto.log.output("===== Sidebar Log =====")

function make_sidebar_layout(div)
  --quarto.log.output("=== next div ===")
  --quarto.log.output("this div's classes are: ", div.classes)
  --quarto.log.output("div.classes:includes('cr-sidebar')?", div.classes:includes("cr-sidebar"))
  if div.classes:includes("cr-sidebar") then
    --quarto.log.output("A sidebar div: ", div)
    for _, block in ipairs(div) do
    quarto.log.output("== next block ==")
    quarto.log.output(block)
    end
  end
end
          

return {
  Div = make_sidebar_layout
}