# Maliens Website

Digital creative agency landing page. 


## File structure

```
MALIENS_WEBSITE/
├── index.html              all page sections
├── font/                    
├── image/                    
├── model/                     Design source files (PSD/XD) — NOT committed
│                                to git, see .gitignore. Store separately.
└── src/
    ├── style.css              Import manifest — entry stylesheet, pulls in
    │                            everything in styles/. Add new sections here.
    ├── main.js                 Entry script — imports + runs every
    │                            section's init() function
    ├── styles/
    │   ├── base.css             Resets, shared variables, typography
    │   ├── header.css           
    │   ├── hero.css               
    │   ├── sections.css            
    │   ├── quotesection.css         
    │   ├── cross-tape.css            
    │   ├── responsive.css             
    │   └── contact.css                 
    └── js/
        ├── header.js              
        ├── heroScene.js            
        ├── nextsectionLogo.js      
        └── contact.js                
```


## Branching

Don't commit directly to `main`. Create a branch per feature or section:

```bash
git checkout -b yourname/contact-form
```

Push it, open a Pull Request on GitHub, and merge once it's been reviewed.

## Design source files

`model/` contains Adobe PSD/XD source files and is excluded from git via
`.gitignore`. These live on your machine only — back them up separately
(Drive/Dropbox), since they won't be in version control.
