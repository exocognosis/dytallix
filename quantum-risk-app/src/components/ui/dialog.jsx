import * as React from "react"

const DialogContext = React.createContext({ open: false, setOpen: () => {} })

const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
          {children}
        </div>
      )}
    </DialogContext.Provider>
  )
}

const DialogContent = ({ className, children, ...props }) => {
  return (
    <div
      className={`relative z-50 bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
}

const DialogHeader = ({ className, children, ...props }) => {
  return (
    <div className={`space-y-2 mb-4 ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

const DialogTitle = ({ className, children, ...props }) => {
  return (
    <h2 className={`text-lg font-semibold ${className || ''}`} {...props}>
      {children}
    </h2>
  )
}

const DialogDescription = ({ className, children, ...props }) => {
  return (
    <p className={`text-sm text-muted-foreground ${className || ''}`} {...props}>
      {children}
    </p>
  )
}

const DialogFooter = ({ className, children, ...props }) => {
  return (
    <div className={`flex gap-2 mt-4 ${className || ''}`} {...props}>
      {children}
    </div>
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
