import * as React from "react"

const AccordionContext = React.createContext({})

const Accordion = ({ type, collapsible, className, children, ...props }) => {
  const [openItem, setOpenItem] = React.useState(null)

  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem, type }}>
      <div className={className} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const AccordionItem = ({ value, className, children, ...props }) => {
  return (
    <div className={`border-b ${className || ''}`} data-value={value} {...props}>
      {children}
    </div>
  )
}

const AccordionTrigger = ({ className, children, ...props }) => {
  const { openItem, setOpenItem } = React.useContext(AccordionContext)
  const value = props.value || children
  const isOpen = openItem === value

  return (
    <button
      className={`flex w-full items-center justify-between py-4 font-medium transition-all hover:underline ${className || ''}`}
      onClick={() => setOpenItem(isOpen ? null : value)}
      {...props}
    >
      {children}
      <svg
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

const AccordionContent = ({ className, children, ...props }) => {
  const { openItem } = React.useContext(AccordionContext)
  const parentValue = props.value || children
  const isOpen = openItem === parentValue

  if (!isOpen) return null

  return (
    <div className={`pb-4 pt-0 ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
