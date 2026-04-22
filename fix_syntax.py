with open("lib/outreach-templates.ts", "r") as f:
    text = f.read()

# The incorrect escaping applies to \` and \${
text = text.replace("\\`", "`").replace("\\${", "${")

with open("lib/outreach-templates.ts", "w") as f:
    f.write(text)

