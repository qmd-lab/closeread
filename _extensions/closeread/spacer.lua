function spacer(args)
  local spacerLength = "40svh"
  if args[1] ~= nil then
    spacerLength = pandoc.utils.stringify(args[1])
  end

  return pandoc.Div({},
    pandoc.Attr("",
      { "cr-spacer" },
      { style = "height: " .. spacerLength }))
end
