export default function FilterParameter(router, columns) {
  const columnsRE = new RegExp(
    `^(?:${columns.map(({ key }) => key).join("|")})`
  );
  function getFilterString() {
    return router.getQuery().filter || "";
  }
  function parse() {
    return getFilterString().split(" & ").reduce((out, clause) => {
      const keyMatch = clause.match(columnsRE);
      if (keyMatch) {
        out[keyMatch[0]] = out[keyMatch[0]] || [];
        out[keyMatch[0]].push(clause.replace(columnsRE, ""));
      }
      return out;
    }, {});
  }
  function read(key) {
    return parse()[key];
  }
  function serialize(f) {
    return Object.keys(f)
      .reduce((out, key) => {
        return out.concat(f[key].map(v => key + v).join(" & "));
      }, [])
      .join(" & ");
  }
  function add(key, value, operation = "=") {
    var current = parse();
    var values = Array.isArray(value) ? value : [value];
    current[key] = values.map(
      v => ` ${v.operation || operation} ${v.value || v}`
    );
    return serialize(current);
  }
  function remove(key) {
    var current = parse();
    delete current[key];
    return serialize(current);
  }
  return { add, read, remove };
}
