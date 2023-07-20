function print_log(doc)
  quarto.log.output(doc)
  return doc
end

return {
  Pandoc = print_log
}