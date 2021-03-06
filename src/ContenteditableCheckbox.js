export default class ContenteditableCheckbox {
  /**
   * @param {*} $el 
   * @param {*} opts {withCheckbox: true} Creates the editable field with a checkbox already started
   *                 {insertAfter: true} Inserts the row after the specified element instead of inside of it
   *                 {content: ''} The textContent to include
   */
  constructor ($el, opts = {}) {
    this.isDeleted = false
    
    // Elements
    this.$ = {
      el: $el,
      group: document.createElement('div'),
      checkbox: document.createElement('div'),
      editable: document.createElement('div'),
      input: null
    }

    // Create a wrapping container
    if (opts.insertAfter) {
      $el.insertAdjacentElement('afterEnd', this.$.group)
    } else {
      $el.appendChild(this.$.group)
    }
    this.$.group.classList.add('contenteditable-checkboxes-group')

    // Add the checkbox container
    this.$.checkbox.classList.add('contenteditable-checkboxes-checkbox-wrap')
    this.$.group.appendChild(this.$.checkbox)
    
    // Add the contenteditable area
    this.$.editable.classList.add('contenteditable-checkboxes-content')
    this.$.editable.setAttribute('contenteditable', true)
    this.$.group.appendChild(this.$.editable)
    this.$.editable.focus()

    this.bindEditor()

    // Handle options
    if (opts.withCheckbox) this.createCheckbox()
    if (opts.content) this.$.editable.textContent = opts.content
    
    window.contenteditableCheckboxInstances.push(this)
    return this
  }

  /**
   * Binds listeners to the editor
   */
  bindEditor () {
    this.$.editable.addEventListener('keyup', ev => {
      this.handleSpace(ev)
      this.handleBackspace(ev)
      this.handleEnter(ev)
      this.handleArrows(ev)
    })
  }

  /**
   * Create a checkbox if [] is typed
   */
  handleSpace (ev) {
    if (ev.key === ' ' && this.$.editable.textContent.substring(0, 2) === '[]' && !this.$.input) {
      this.createCheckbox()
    }
  }

  /**
   * Either delete the checkbox or delete the row
   */
  handleBackspace (ev) {
    if (ev.key === 'Backspace' && !this.getCaret()) {
      // Delete the checkbox
      if (this.$.input) {
        this.deleteCheckbox()
      // Delete the row
      } else {
        if (this.$.group.previousSibling) {
          this.deleteRow({focus: this.$.group.previousSibling.querySelector('.contenteditable-checkboxes-content')})
        }
      }
    }
  }
  
  /**
   * Either create a new row or delete the current row if it's empty with a checkbox
   */
  handleEnter (ev) {
    if (ev.key === 'Enter' && this.$.input) {
      // Delete checkbox with enter on empty row
      if (this.$.editable.textContent === '') {
        this.$.editable.textContent = ''
        this.deleteCheckbox()
      // Create new row
      } else {
        const caret = this.getCaret()
        const thisContent = this.$.editable.textContent.substring(0, caret)
        const nextContent = this.$.editable.textContent.slice(caret)
        this.$.editable.textContent = thisContent
        this.createNewRow({content: nextContent})
      }
    } 
  }

  /**
   * - Use arrows to select row above or below
   * - Use CTRL to shift row above or below
   * - Updates lastCaret
   */
  handleArrows (ev) {
    if (ev.ctrlKey) {
      if (ev.key === 'ArrowUp' && this.$.group.previousSibling) {
        this.$.group.previousSibling.before(this.$.group)
        this.setCaret(this.lastCaret)
      }
      if (ev.key === 'ArrowDown' && this.$.group.nextSibling) {
        this.$.group.nextSibling.after(this.$.group)
        this.setCaret(this.lastCaret)
      }
    } else {
      if (ev.key === 'ArrowUp' && this.$.group.previousSibling) {
        this.$.group.previousSibling.querySelector('.contenteditable-checkboxes-content').focus()
      }
      if (ev.key === 'ArrowDown' && this.$.group.nextSibling) {
        this.$.group.nextSibling.querySelector('.contenteditable-checkboxes-content').focus()
      }
    }

    // Update caret
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') {
      this.lastCaret = this.getCaret()
    }
  }
  
  /**
   * Adds a checkbox element
   * - Remvoes the [] from the contenteditable
   */
  createCheckbox () {
    this.$.input = document.createElement('input')
    this.$.input.setAttribute('type', 'checkbox')
    this.$.input.classList.add('contenteditable-checkboxes-checkbox-input')
    this.$.checkbox.appendChild(this.$.input)

    this.$.group.classList.add('contenteditable-checkboxes-has-checkbox')

    this.$.editable.textContent = this.$.editable.textContent.substring(3)
  }

  /**
   * Creates a new row with a checkbox
   */
  createNewRow ({content}) {
    new ContenteditableCheckbox(this.$.group, {
      withCheckbox: true,
      insertAfter: true,
      content
    })
  }

  /**
   * Deletes the checkbox
   */
  deleteCheckbox () {
    this.$.input.remove()
    this.$.input = null
    this.$.group.classList.remove('contenteditable-checkboxes-has-checkbox')
  }

  /**
   * Deletes the current row
   * @param focus The element to focus
   */
  deleteRow ({focus}) {
    const focusLenth = focus.textContent.length
    focus.textContent += this.$.editable.textContent
    
    this.setCaret(focusLenth, focus)
    this.$.group.remove()

    this.isDeleted = true
  }

  /**
   * Gets the caret position within the contenteditable
   * @see https://stackoverflow.com/a/4812022
   */
  getCaret () {
    let caretOffset = 0
    let doc = this.$.editable.ownerDocument || this.$.editable.document
    let win = doc.defaultView || doc.parentWindow
    let sel

    if (typeof win.getSelection != 'undefined') {
      sel = win.getSelection()
      if (sel.rangeCount > 0) {
        let range = win.getSelection().getRangeAt(0)
        let preCaretRange = range.cloneRange()
        preCaretRange.selectNodeContents(this.$.editable)
        preCaretRange.setEnd(range.endContainer, range.endOffset)
        caretOffset = preCaretRange.toString().length
      }
    } else if ( (sel = doc.selection) && sel.type != 'Control') {
      let textRange = sel.createRange()
      let preCaretTextRange = doc.body.createTextRange()
      preCaretTextRange.moveToElementText(this.$.editable)
      preCaretTextRange.setEndPoint('EndToEnd', textRange)
      caretOffset = preCaretTextRange.text.length
    }
    
    return caretOffset
  }

  /**
   * Set caret at given index
   * @see https://stackoverflow.com/a/6249440
   * 
   * @param index The position to set the caret to
   * @param target (Optional) The target element to set it to (defaults to current contenteditable)
   */
  setCaret (index, target) {
    if (!target) target = this.$.editable

    let range = document.createRange()
    let sel = window.getSelection()

    range.setStart(target.childNodes[0], index)
    range.collapse()
    sel.removeAllRanges()
    sel.addRange(range)

    target.focus()
  }
}